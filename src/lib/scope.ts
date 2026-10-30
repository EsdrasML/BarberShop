import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getActiveBranches, resolveBranchId } from "@/lib/branches";
import { db } from "@/lib/db";

type Scoped = { role: string; branchId: string | null };

/**
 * Alcance del administrador: con sucursal asignada solo ve y opera esa sucursal.
 * Sin sucursal (propietario o administrador general) ve todas.
 */
export const scopeBranchId = (u: Scoped): string | null => (u.role === "ADMIN" ? u.branchId : null);
export const isBranchScoped = (u: Scoped) => scopeBranchId(u) !== null;
export const canAccessBranch = (u: Scoped, branchId: string | null) => {
  const s = scopeBranchId(u);
  return s === null || s === branchId;
};

/** Filtro para consultas de ventas y citas. */
export const branchWhere = (u: Scoped): { branchId?: string } => {
  const s = scopeBranchId(u);
  return s ? { branchId: s } : {};
};

/** Barberos que atienden en la sucursal del administrador (o que atienden en todas). */
export const barbersWhere = (u: Scoped): Prisma.BarberWhereInput => {
  const s = scopeBranchId(u);
  return s ? { OR: [{ branches: { some: { id: s } } }, { branches: { none: {} } }] } : {};
};

/** Sucursal de una operación: la del administrador, o la elegida si es administrador general. */
export async function resolveAdminBranch(u: Scoped, input: string | null | undefined) {
  const s = scopeBranchId(u);
  if (s) return { ok: true as const, id: s };
  return resolveBranchId(input, await getActiveBranches());
}

// Las comprobaciones de acceso redirigen sin explicar nada: no se revela si el registro existe.
export async function assertAppointmentAccess(u: Scoped, id: string) {
  const a = await db.appointment.findUnique({ where: { id }, select: { branchId: true } });
  if (!a || !canAccessBranch(u, a.branchId)) redirect("/admin");
}

export async function assertSaleAccess(u: Scoped, id: string) {
  const s = await db.sale.findUnique({ where: { id }, select: { branchId: true } });
  if (!s || !canAccessBranch(u, s.branchId)) redirect("/admin");
}

export async function assertBarberAccess(u: Scoped, id: string) {
  const s = scopeBranchId(u);
  if (!s) return;
  const ok = await db.barber.findFirst({ where: { id, deletedAt: null, ...barbersWhere(u) }, select: { id: true } });
  if (!ok) redirect("/admin");
}
