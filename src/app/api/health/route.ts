import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Comprueba la conexión con Neon y que el seed se haya ejecutado.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const constraint = await db.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok FROM pg_constraint WHERE conname = 'Appointment_no_overlap'`;
    const [services, barbers, shop] = await Promise.all([
      db.service.count(),
      db.barber.count(),
      db.shopSettings.findUnique({ where: { id: "shop" }, select: { name: true } }),
    ]);
    // En producción solo se confirma que responde: los detalles internos no se publican.
    if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: true, database: "conectada", shop: shop?.name ?? null, services, barbers, overlapConstraint: constraint.length > 0 });
  } catch {
    return NextResponse.json({ ok: false, database: "sin conexión" }, { status: 500 });
  }
}
