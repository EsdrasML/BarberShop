import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ customers: [] });
  const where: Prisma.CustomerWhereInput = {
    OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ],
  };
  const customers = await db.customer.findMany({ where, orderBy: { fullName: "asc" }, take: 8, select: { id: true, fullName: true, email: true, phone: true } });
  const sums = await db.pointsLedger.groupBy({ by: ["customerId"], where: { customerId: { in: customers.map((c) => c.id) } }, _sum: { delta: true } });
  const pts = new Map(sums.map((x) => [x.customerId, x._sum.delta ?? 0]));
  return NextResponse.json({ customers: customers.map((c) => ({ ...c, points: pts.get(c.id) ?? 0 })) });
}
