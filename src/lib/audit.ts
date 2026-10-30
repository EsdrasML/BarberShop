import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Registro de acciones administrativas importantes (precios, reglas, borrados…). */
export async function audit(actorId: string, action: string, entity: string, entityId?: string, data?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, data } });
}
