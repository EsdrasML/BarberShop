import Link from "next/link";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { formatShortDate } from "@/lib/appointments-ui";
import { db } from "@/lib/db";
import { MONTHS_ES, formatDMY } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { salesReport } from "@/lib/reports";
import { isBranchScoped, scopeBranchId } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs, zonedToUtc } from "@/lib/tz";

type SP = { rango?: string; desde?: string; hasta?: string; sucursal?: string };
const isDate = (v?: string): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const parts = (d: string) => d.split("-").map(Number) as [number, number, number];

export default async function SalesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("ADMIN");
  const sp = await searchParams;
  const shop = await getShop();
  const tz = shop.timezone;
  const today = utcToLocalInputs(new Date(), tz).date;
  const [ty, tm] = parts(today);

  // Periodo: hoy, este mes (por defecto), mes anterior o fechas elegidas en el calendario.
  let from = `${ty}-${String(tm).padStart(2, "0")}-01`;
  let to = today;
  let preset = "mes";
  if (sp.rango === "hoy") { from = to = today; preset = "hoy"; }
  else if (sp.rango === "anterior") {
    const py = tm === 1 ? ty - 1 : ty, pm = tm === 1 ? 12 : tm - 1;
    from = `${py}-${String(pm).padStart(2, "0")}-01`;
    to = utcToLocalInputs(new Date(Date.UTC(ty, tm - 1, 0, 12)), "UTC").date;
    preset = "anterior";
  } else if (isDate(sp.desde) && isDate(sp.hasta) && sp.desde <= sp.hasta) { from = sp.desde; to = sp.hasta; preset = "custom"; }

  // Un administrador de sucursal solo ve la suya; el general puede filtrar.
  const scoped = isBranchScoped(user);
  const branches = scoped ? [] : await db.branch.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  const chosen = scoped ? scopeBranchId(user)! : branches.find((b) => b.id === sp.sucursal)?.id;
  const branchName = scoped
    ? (await db.branch.findUnique({ where: { id: chosen! }, select: { name: true } }))?.name
    : branches.find((b) => b.id === chosen)?.name;

  const [fy, fm, fd] = parts(from), [ey, em, ed] = parts(to);
  const r = await salesReport(zonedToUtc(fy, fm, fd, 0, 0, tz), zonedToUtc(ey, em, ed + 1, 0, 0, tz), tz, chosen);
  const money = formatMoney;

  const qs = (over: Partial<SP>) => new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][]).toString();
  const presetLink = (rango: string, label: string) => (
    <Link key={rango} href={`/admin/ventas?${qs({ rango, desde: undefined, hasta: undefined })}`} aria-current={preset === rango ? "page" : undefined}
      className={`btn rounded-full border px-5 py-2.5 text-sm ${preset === rango ? "border-white bg-white text-black" : "border-graphite text-steel hover:text-white"}`}>{label}</Link>
  );
  const kpis: Array<[string, number]> = [
    ["Total de ingresos", r.total.ingresos],
    ["Total en cortes", r.total.cortes],
    ["Total en productos", r.total.productos],
    ["Total de descuentos aplicados", r.total.descuentos],
  ];
  const years = [ty, ty - 1, ty - 2];

  return (
    <>
      <PageHeader title="Ventas" subtitle={`${formatDMY(from)} – ${formatDMY(to)}${branchName ? ` · ${branchName}` : branches.length > 1 ? " · Todas las sucursales" : ""}`}>
        <Link href="/admin/walkin" className={buttonClasses({ variant: "accent", size: "sm" })}>Nueva venta / Walk-in</Link>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        {presetLink("hoy", "Hoy")}{presetLink("mes", "Este mes")}{presetLink("anterior", "Mes anterior")}
        <form className="flex flex-wrap items-end gap-2">
          {!scoped && sp.sucursal && <input type="hidden" name="sucursal" value={sp.sucursal} />}
          <div className="w-44"><DatePicker label="Desde" name="desde" defaultValue={from} today={today} max={today} /></div>
          <div className="w-44"><DatePicker label="Hasta" name="hasta" defaultValue={to} today={today} max={today} /></div>
          <Button type="submit" variant="ghost" size="sm">Aplicar</Button>
        </form>
      </div>

      {branches.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="label-micro mr-2 text-steel">Sucursal</span>
          {[{ id: "", name: "Todas" }, ...branches].map((b) => (
            <Link key={b.id || "todas"} href={`/admin/ventas?${qs({ sucursal: b.id || undefined })}`} aria-current={(chosen ?? "") === b.id ? "page" : undefined}
              className={`btn rounded-full border px-4 py-2 text-sm ${(chosen ?? "") === b.id ? "border-gold bg-gold text-on-accent" : "border-graphite text-steel hover:text-white"}`}>{b.name}</Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, cents]) => (
          <Card key={label} tone="iron" className="p-6 md:p-6">
            <p className="label-micro text-steel">{label}</p>
            <p className="mt-3 text-3xl text-gold-text">{money(cents)}</p>
          </Card>
        ))}
      </div>

      {!scoped && !chosen && r.byBranch.length > 1 && (
        <section className="mt-10">
          <h2 className="feature-heading mb-4">Por sucursal</h2>
          <TableWrap>
            <thead><tr><th className={th}>Sucursal</th><th className={th}>Cortes</th><th className={th}>Productos</th><th className={th}>Descuentos</th><th className={th}>Ingresos</th></tr></thead>
            <tbody>{r.byBranch.map((x) => (
              <tr key={x.name} className={rowClass}><td className={td}>{x.name}</td><td className={td}>{money(x.cortes)}</td><td className={td}>{money(x.productos)}</td><td className={td}>{money(x.descuentos)}</td><td className={td}>{money(x.ingresos)}</td></tr>
            ))}</tbody>
          </TableWrap>
        </section>
      )}

      <section className="mt-10">
        <h2 className="feature-heading mb-4">Ventas del periodo</h2>
        {r.sales.length === 0 ? <EmptyState>No hay ventas cobradas en este periodo.</EmptyState> : (
          <TableWrap>
            <thead><tr><th className={th}>Fecha</th><th className={th}>Cliente</th><th className={th}>Barbero</th><th className={th}>Cortes</th><th className={th}>Productos</th><th className={th}>Descuento</th><th className={th}>Total</th><th className={th}><span className="sr-only">Detalle</span></th></tr></thead>
            <tbody>{r.sales.map((x) => (
              <tr key={x.sale.id} className={rowClass}>
                <td className={td}>{formatShortDate(x.sale.paidAt ?? x.sale.createdAt, tz)}</td>
                <td className={td}>{x.sale.customer?.fullName ?? "Visita"}</td>
                <td className={td}>{x.sale.barber?.displayName ?? "—"}</td>
                <td className={td}>{money(x.cortes)}</td><td className={td}>{money(x.productos)}</td>
                <td className={td}>{x.descuentos ? money(x.descuentos) : "—"}</td><td className={td}>{money(x.ingresos)}</td>
                <td className={td}><Link href={`/admin/ventas/${x.sale.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Ver</Link></td>
              </tr>
            ))}</tbody>
          </TableWrap>
        )}
      </section>

      <Card tone="iron" className="mt-10 p-5 md:p-5">
        <form action="/admin/ventas/pdf" method="get" target="_blank" className="flex flex-wrap items-end gap-3">
          <p className="mr-2 w-full text-sm text-steel sm:w-auto">Resumen mensual en PDF</p>
          <label className="flex flex-col gap-1"><span className="label-micro text-steel">Mes</span>
            <select name="mes" defaultValue={tm} className="rounded-xl border border-ash bg-black px-3 py-2.5 capitalize text-white focus:border-white">
              {MONTHS_ES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select></label>
          <label className="flex flex-col gap-1"><span className="label-micro text-steel">Año</span>
            <select name="anio" defaultValue={ty} className="rounded-xl border border-ash bg-black px-3 py-2.5 text-white focus:border-white">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select></label>
          {branches.length > 1 && (
            <label className="flex flex-col gap-1"><span className="label-micro text-steel">Sucursal</span>
              <select name="sucursal" defaultValue={chosen ?? "todas"} className="rounded-xl border border-ash bg-black px-3 py-2.5 text-white focus:border-white">
                <option value="todas">Todas</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></label>
          )}
          <Button type="submit" variant="accent" size="sm">Exportar PDF</Button>
        </form>
      </Card>
    </>
  );
}
