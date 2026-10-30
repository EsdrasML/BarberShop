import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MONTHS_ES, formatDMY } from "@/lib/dates";
import { parseHex } from "@/lib/color";
import { formatMoney } from "@/lib/money";
import { buildMonthlyPdf } from "@/lib/pdf";
import { salesReport } from "@/lib/reports";
import { isBranchScoped, scopeBranchId } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { zonedToUtc } from "@/lib/tz";

export const dynamic = "force-dynamic";

// /admin/ventas/pdf?mes=10&anio=2026[&sucursal=<id|todas>]
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const q = new URL(req.url).searchParams;
  const m = Number(q.get("mes")), y = Number(q.get("anio"));
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) {
    return NextResponse.json({ error: "Mes o año no válido." }, { status: 400 });
  }

  const shop = await getShop();
  // Un administrador de sucursal solo exporta la suya, sin importar lo que envíe el navegador.
  const requested = q.get("sucursal");
  const branchId = isBranchScoped(user) ? scopeBranchId(user)! : requested && requested !== "todas" ? requested : null;
  const branch = branchId ? await db.branch.findUnique({ where: { id: branchId } }) : null;
  if (branchId && !branch) return NextResponse.json({ error: "Sucursal no encontrada." }, { status: 404 });

  const r = await salesReport(zonedToUtc(y, m, 1, 0, 0, shop.timezone), zonedToUtc(y, m + 1, 1, 0, 0, shop.timezone), shop.timezone, branch?.id);
  const money = formatMoney;
  const line = (name: string, x: { cortes: number; productos: number; descuentos: number; ingresos: number }) =>
    [name, money(x.cortes), money(x.productos), money(x.descuentos), money(x.ingresos)];
  const headers = (first: string) => [first, "Cortes", "Productos", "Descuentos", "Ingresos"];

  const pdf = await buildMonthlyPdf({
    shopName: shop.name,
    periodLabel: `${MONTHS_ES[m - 1][0].toUpperCase()}${MONTHS_ES[m - 1].slice(1)} ${y}`,
    branchLabel: branch ? branch.name : "Todas las sucursales",
    generatedLabel: new Intl.DateTimeFormat("es-GT", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: shop.timezone }).format(new Date()),
    accent: parseHex(shop.accentColor) ?? [255, 192, 0],
    kpis: [
      ["Total de ingresos", money(r.total.ingresos)], ["Total en cortes", money(r.total.cortes)],
      ["Total en productos", money(r.total.productos)], ["Total de descuentos aplicados", money(r.total.descuentos)],
    ],
    tables: [
      ...(!branch && r.byBranch.length > 1 ? [{ title: "Por sucursal", headers: headers("Sucursal"), rows: r.byBranch.map((b) => line(b.name, b)) }] : []),
      { title: "Por día", headers: headers("Día"), rows: r.daily.map((d) => line(formatDMY(d.name), d)), total: line("Total del mes", r.total) },
    ],
  });

  const slug = branch ? `-${branch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ventas-${y}-${String(m).padStart(2, "0")}${slug}.pdf"`, "Cache-Control": "no-store" },
  });
}
