import { db } from "@/lib/db";
import { utcToLocalInputs } from "@/lib/tz";

type Row = { name: string; cortes: number; productos: number; descuentos: number; ingresos: number; ventas: number };

/**
 * Reporte de ventas de un periodo [from, to). Solo cuenta ventas COBRADAS (dinero que se movió):
 *   ingresos = cortes + productos
 *   cortes    = servicios cobrados, ya con el descuento por puntos aplicado
 *   descuentos = lo que se dejó de cobrar por el beneficio de puntos
 */
export async function salesReport(from: Date, to: Date, tz: string, branchId?: string) {
  const paid = await db.sale.findMany({
    where: { status: "PAID", paidAt: { gte: from, lt: to }, ...(branchId ? { branchId } : {}) },
    orderBy: { paidAt: "desc" },
    include: {
      items: true,
      barber: { select: { displayName: true } },
      customer: { select: { fullName: true } },
      branch: { select: { name: true } },
    },
  });

  const blank = (name: string): Row => ({ name, cortes: 0, productos: 0, descuentos: 0, ingresos: 0, ventas: 0 });
  const total = blank("Total");
  const byBranch = new Map<string, Row>();
  const daily = new Map<string, Row>();

  const add = (m: Map<string, Row>, key: string, name: string, r: Omit<Row, "name">) => {
    const row = m.get(key) ?? blank(name);
    row.cortes += r.cortes; row.productos += r.productos; row.descuentos += r.descuentos; row.ingresos += r.ingresos; row.ventas += r.ventas;
    m.set(key, row);
  };

  const sales = paid.map((s) => {
    const productos = s.items.filter((i) => i.type === "PRODUCT").reduce((n, i) => n + i.totalCents, 0);
    const ingresos = s.totalCents;
    return { sale: s, productos, cortes: ingresos - productos, descuentos: s.discountCents, ingresos };
  });

  for (const x of sales) {
    const r = { cortes: x.cortes, productos: x.productos, descuentos: x.descuentos, ingresos: x.ingresos, ventas: 1 };
    add(new Map([["t", total]]), "t", "Total", r);
    add(byBranch, x.sale.branchId ?? "none", x.sale.branch?.name ?? "Sin sucursal", r);
    const day = utcToLocalInputs(x.sale.paidAt ?? x.sale.createdAt, tz).date;
    add(daily, day, day, r);
  }

  return {
    sales, // cada venta con su desglose
    total,
    byBranch: [...byBranch.values()].sort((a, b) => b.ingresos - a.ingresos),
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, r]) => r),
  };
}
