import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { isPlatformOwner } from "@/lib/owner";
import { formatMoney } from "@/lib/money";
import { barbersWhere, branchWhere } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs, zonedToUtc } from "@/lib/tz";

export default async function AdminHome() {
  const user = await requireRole("ADMIN");
  const owner = isPlatformOwner(user);
  const shop = await getShop();
  const [ty, tm, td] = utcToLocalInputs(new Date(), shop.timezone).date.split("-").map(Number);
  const dayStart = zonedToUtc(ty, tm, td, 0, 0, shop.timezone);
  const dayEnd = zonedToUtc(ty, tm, td + 1, 0, 0, shop.timezone);
  const monthStart = zonedToUtc(ty, tm, 1, 0, 0, shop.timezone);
  const [services, products, tracked, clients, barbers, todayAppts, paidToday, paidMonth] = await Promise.all([
    db.service.count({ where: { isActive: true, deletedAt: null } }),
    db.product.count({ where: { isActive: true, deletedAt: null } }),
    db.product.findMany({ where: { trackStock: true, deletedAt: null }, select: { stock: true, lowStockAt: true } }),
    db.customer.count(),
    db.barber.count({ where: { isActive: true, deletedAt: null, ...barbersWhere(user) } }),
    db.appointment.count({ where: { ...branchWhere(user), startsAt: { gte: dayStart, lt: dayEnd }, status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] } } }),
    db.sale.aggregate({ where: { ...branchWhere(user), status: "PAID", paidAt: { gte: dayStart, lt: dayEnd } }, _sum: { totalCents: true } }),
    db.sale.aggregate({ where: { ...branchWhere(user), status: "PAID", paidAt: { gte: monthStart, lt: dayEnd } }, _sum: { totalCents: true } }),
  ]);
  const low = tracked.filter((p) => p.stock <= p.lowStockAt).length;

  const stats = [
    ["Cobrado hoy", formatMoney(paidToday._sum.totalCents ?? 0), "/admin/ventas?rango=hoy"],
    ["Cobrado del mes", formatMoney(paidMonth._sum.totalCents ?? 0), "/admin/ventas"],
    ["Citas de hoy", todayAppts, "/admin/citas"],
    ["Servicios activos", services, owner ? "/admin/servicios" : null],
    ["Productos activos", products, "/admin/productos"],
    ["Productos con existencias bajas", low, "/admin/productos"],
    ["Clientes registrados", clients, "/admin/clientes"],
    ["Barberos activos", barbers, "/admin/barberos"],
  ] as const;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Vista general del negocio." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, href]) => {
          const body = (
            <Card tone="iron" className="h-full">
              <p className="label-micro text-steel">{label}</p>
              <p className="sub-section mt-3">{value}</p>
            </Card>
          );
          return href ? <Link key={label} href={href}>{body}</Link> : <div key={label}>{body}</div>;
        })}
      </div>
      <p className="mt-8 text-sm text-steel">
        Las cifras de dinero son lo efectivamente cobrado; el detalle por barbero, servicio, producto y método está en Ventas.
      </p>
    </>
  );
}
