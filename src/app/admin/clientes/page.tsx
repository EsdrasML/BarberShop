import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { FormAlert } from "@/components/auth/form-parts";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { formatShortDate } from "@/lib/appointments-ui";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

const PAGE_SIZE = 25;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; ok?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const term = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.CustomerWhereInput = term
    ? { OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
      ] }
    : {};

  const [shop, total, customers] = await Promise.all([
    getShop(),
    db.customer.count({ where }),
    db.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  const ids = customers.map((c) => c.id);
  const [points, visits] = await Promise.all([
    db.pointsLedger.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _sum: { delta: true } }),
    db.appointment.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, status: { not: "CANCELLED" } }, _count: { _all: true } }),
  ]);
  const pointsOf = new Map(points.map((p) => [p.customerId, p._sum.delta ?? 0]));
  const visitsOf = new Map(visits.map((v) => [v.customerId, v._count._all]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/admin/clientes?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${total} ${total === 1 ? "registrado" : "registrados"}`}>
        <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/clientes/nuevo" className={buttonClasses({ variant: "accent", size: "sm" })}>Registrar cliente</Link>
        <form role="search" className="flex gap-2">
          <input
            name="q" defaultValue={term} type="search" aria-label="Buscar clientes"
            placeholder="Buscar por nombre, correo o teléfono"
            className="w-72 max-w-full rounded-full border border-ash bg-black px-5 py-3 text-sm text-white placeholder:text-ash focus:border-white"
          />
          <Button type="submit" variant="ghost" size="sm">Buscar</Button>
        </form>
        </div>
      </PageHeader>

      {sp.ok && <div className="mb-6"><FormAlert tone="success">Cliente registrado.</FormAlert></div>}
      {customers.length === 0 ? (
        <EmptyState>{term ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes. Aparecerán aquí al registrarse o al registrar uno en el local."}</EmptyState>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Cliente</th><th className={th}>Contacto</th><th className={th}>Citas</th>
              <th className={th}>Puntos</th><th className={th}>Descuento</th><th className={th}>Desde</th><th className={th}><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const pts = pointsOf.get(c.id) ?? 0;
              const target = shop.pointsForBenefit;
              const pct = Math.min(100, Math.round((pts / target) * 100));
              return (
                <tr key={c.id} className={rowClass}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-text" aria-hidden="true">
                        {c.fullName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p>{c.fullName}</p>
                        <Badge tone={c.userId ? "info" : "neutral"} className="mt-1">{c.userId ? "Con cuenta" : "Sin cuenta"}</Badge>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <p>{c.email ?? "—"}</p>
                    <p className="text-steel">{c.phone || "—"}</p>
                  </td>
                  <td className={td}>{visitsOf.get(c.id) ?? 0}</td>
                  <td className={td}>
                    <p className="text-gold-text">★ {pts}</p>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-graphite" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(pts, target)} aria-label="Progreso de puntos">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className={td}>
                    {pts >= target ? <span className="text-gold-text">Beneficio disponible</span> : <span className="text-steel">Faltan {target - pts} pts</span>}
                  </td>
                  <td className={td}>{formatShortDate(c.createdAt, shop.timezone)}</td>
                  <td className={td}><Link href={`/admin/clientes/${c.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link></td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-steel">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href(page - 1)} className={buttonClasses({ variant: "ghost", size: "sm" })}>Anterior</Link>}
            {page < pages && <Link href={href(page + 1)} className={buttonClasses({ variant: "ghost", size: "sm" })}>Siguiente</Link>}
          </div>
        </div>
      )}
    </>
  );
}
