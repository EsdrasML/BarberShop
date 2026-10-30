import { db } from "@/lib/db";

export function getActiveBranches() {
  return db.branch.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, address: true } });
}

/**
 * Decide la sucursal de una operación:
 *  - sin sucursales activas → null (el negocio funciona sin sucursales);
 *  - una sola → esa;
 *  - varias → la elegida (debe ser una de las activas).
 */
export function resolveBranchId(input: string | null | undefined, branches: Array<{ id: string }>): { ok: true; id: string | null } | { ok: false; error: string } {
  if (branches.length === 0) return { ok: true, id: null };
  if (branches.length === 1) return { ok: true, id: branches[0].id };
  if (!input) return { ok: false, error: "Elige la sucursal." };
  return branches.some((b) => b.id === input) ? { ok: true, id: input } : { ok: false, error: "La sucursal elegida no es válida." };
}

/** Un barbero sin sucursales asignadas atiende en todas. */
export const barberServesBranch = (barberBranchIds: string[], branchId: string | null) =>
  !branchId || barberBranchIds.length === 0 || barberBranchIds.includes(branchId);
