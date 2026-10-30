"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireOwner } from "@/lib/session";
import { firstErrors } from "@/lib/validation/auth";
import { branchSchema } from "@/lib/validation/people";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const read = (fd: FormData) => {
  const values = { name: str(fd, "name"), address: str(fd, "address"), phone: str(fd, "phone"), sortOrder: str(fd, "sortOrder") || "0" };
  return { values, input: { ...values, isActive: fd.get("isActive") === "on" } };
};

// Las sucursales (nombre, dirección) son configuración del sitio: solo el propietario.
export async function createBranchAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { values, input } = read(fd);
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const b = await db.branch.create({ data: parsed.data });
  await audit(owner.id, "branch.create", "Branch", b.id, { name: b.name });
  revalidatePath("/", "layout");
  redirect("/admin/sucursales");
}

export async function updateBranchAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { values, input } = read(fd);
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  // Desactivar una sucursal no borra sus ventas ni su historial.
  await db.branch.update({ where: { id }, data: parsed.data });
  await audit(owner.id, "branch.update", "Branch", id, { name: parsed.data.name, isActive: parsed.data.isActive });
  revalidatePath("/", "layout");
  return { message: "Sucursal guardada.", values };
}
