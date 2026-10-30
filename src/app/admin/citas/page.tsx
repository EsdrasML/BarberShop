import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/input";
import { formatDay, formatTimeRange, statusLabel, statusTone } from "@/lib/appointments-ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { barbersWhere, branchWhere, isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs, zonedToUtc } from "@/lib/tz";

const PAGE_SIZE = 20;
type SP = { vista?: string; estado?: string; barbero?: string; sucursal?: string; fecha?: string; q?: string; page?: string };

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("ADMIN");
  const sp = await searchParams;
  const shop = await getShop();
  const tz = shop.timezone;
  const history = sp.vista === "historial";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80);

  const today = utcToLocalInputs(new Date(), tz).date;
  const [ty, tm, td] = today.split("-").map(Number);
  const startOfToday = zonedToUtc(ty, tm, td, 0, 0, tz);

  const where: Prisma.AppointmentWhereInput = {};
  if (sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha)) {
    const [y, m, d] = sp.fecha.split("-").map(Number);
    where.startsAt = { gte: zonedToUtc(y, m, d, 0, 0, tz), lt: zonedToUtc(y, m, d + 1, 0, 0, tz) };
  } else {
    where.startsAt = history ? { lt: startOfToday } : { gte: startOfToday };
  }
  if (sp.estado && sp.estado in statusLabel) where.status = sp.estado as Prisma.AppointmentWhereInput["status"];
  if (sp.barbero) where.barberId = sp.barbero;
  Object.assign(where, branchWhere(user)); // un administrador de sucursal solo ve las citas de la suya
  if (!isBranchScoped(user) && sp.sucursal) where.branchId = sp.sucursal;
  if (q) where.customer = { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] };

  const [total, items, barbers, branches] = await Promise.all([
    db.appointment.count({ where }),
    db.appointment.findMany({
      where, orderBy: { startsAt: history ? "desc" : "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { customer: true, branch: { select: { name: true } }, barber: { select: { displayName: true } }, service: { select: { name: true } } },
    }),
    db.barber.findMany({ where: { deletedAt: null, ...barbersWhere(user) }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    db.branch.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (over: Partial<SP>) => `/admin/citas?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <>
      <PageHeader title="Citas" subtitle={`${total} ${total === 1 ? "cita encontrada" : "citas encontradas"}`}>
        <Link href="/admin/citas/nueva" className={buttonClasses({ variant: "accent", size: "sm" })}>Nueva cita</Link>
      </PageHeader>

      <div className="mb-6 flex gap-2">
        {[["", "Próximas"], ["historial", "Historial"]].map(([v, label]) => (
          <Link key={v} href={link({ vista: v || undefined, page: undefined })} aria-current={(sp.vista ?? "") === v ? "page" : undefined}
            className={`btn rounded-full border px-5 py-2.5 text-sm ${(sp.vista ?? "") === v ? "border-white bg-white text-black" : "border-graphite text-steel hover:text-white"}`}>{label}</Link>
        ))}
      </div>

      <Card tone="iron" className="mb-6">
        <form className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <input type="hidden" name="vista" value={sp.vista ?? ""} />
          <SelectField label="Estado" name="estado" defaultValue={sp.estado ?? ""}>
            <option value="">Todos</option>
            {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </SelectField>
          <SelectField label="Barbero" name="barbero" defaultValue={sp.barbero ?? ""}>
            <option value="">Todos</option>
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.displayName}</option>)}
          </SelectField>
          {!isBranchScoped(user) && branches.length > 1 && (
            <SelectField label="Sucursal" name="sucursal" defaultValue={sp.sucursal ?? ""}>
              <option value="">Todas</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectField>
          )}
          <DatePicker label="Fecha" name="fecha" defaultValue={sp.fecha ?? ""} clearable />
          <label className="flex flex-col gap-2"><span className="label-micro text-steel">Cliente</span>
            <input type="search" name="q" defaultValue={q} placeholder="Nombre, correo o teléfono" className="w-full rounded-xl border border-ash bg-black px-4 py-3.5 text-white placeholder:text-ash focus:border-white" /></label>
          <div className="flex items-end gap-2"><Button type="submit" variant="ghost" size="sm">Filtrar</Button>
            <Link href="/admin/citas" className={buttonClasses({ variant: "ghost", size: "sm" })}>Limpiar</Link></div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>No hay citas con estos filtros.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <Card tone="iron" className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
                <div className="flex flex-col gap-1.5">
                  <Badge tone={statusTone[a.status]} className="self-start">{statusLabel[a.status]}</Badge>
                  <p className="text-lg">{a.customer.fullName}</p>
                  <p className="text-sm text-steel">{a.customer.email ?? "Sin correo"} · {a.customer.phone || "Sin teléfono"}</p>
                  <p className="text-sm text-smoke"><span className="capitalize">{formatDay(a.startsAt, tz)}</span> · {formatTimeRange(a.startsAt, a.endsAt, tz)} · {a.branch ? `${a.branch.name} · ` : ""}{a.barber.displayName} · <span className="text-gold-text">{a.service.name} — {formatMoney(a.priceCents)}</span></p>
                </div>
                <Link href={`/admin/citas/${a.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Gestionar</Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-steel">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={link({ page: String(page - 1) })} className={buttonClasses({ variant: "ghost", size: "sm" })}>Anterior</Link>}
            {page < pages && <Link href={link({ page: String(page + 1) })} className={buttonClasses({ variant: "ghost", size: "sm" })}>Siguiente</Link>}
          </div>
        </div>
      )}
    </>
  );
}
