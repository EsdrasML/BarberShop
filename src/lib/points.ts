import { db } from "@/lib/db";

/** Saldo = suma del historial de movimientos (nunca se guarda un saldo aparte). */
export async function getPointsBalance(userId: string): Promise<number> {
  const r = await db.pointsLedger.aggregate({
    where: { customer: { userId } },
    _sum: { delta: true },
  });
  return r._sum.delta ?? 0;
}
