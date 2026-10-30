"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireRole } from "@/lib/session";
import { firstErrors } from "@/lib/validation/auth";
import { customerSchema } from "@/lib/validation/people";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const read = (fd: FormData) => ({ fullName: str(fd, "fullName"), phone: str(fd, "phone"), email: str(fd, "email") });

async function emailTaken(email: string, exceptId?: string) {
  const found = await db.customer.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(found);
}

/** Registro de un cliente en el local (sin cuenta). Si luego se registra con ese correo verificado, se une solo. */
export async function createCustomerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const values = read(fd);
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { fullName, phone, email } = parsed.data;
  if (email && (await emailTaken(email))) return { fieldErrors: { email: "Ya existe un cliente con ese correo." }, values };

  const customer = await db.customer.create({ data: { fullName, phone, email } });
  await audit(admin.id, "customer.create", "Customer", customer.id, { source: "walk-in" });
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes?ok=1");
}

export async function updateCustomerAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const values = read(fd);
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const current = await db.customer.findUnique({ where: { id } });
  if (!current) return { error: "El cliente ya no existe." };

  const { fullName, phone, email } = parsed.data;
  // Con cuenta propia, el correo es el de la cuenta y no se cambia desde aquí.
  const newEmail = current.userId ? current.email : email;
  if (!current.userId && newEmail && (await emailTaken(newEmail, id))) {
    return { fieldErrors: { email: "Ese correo ya pertenece a otro cliente." }, values };
  }
  await db.customer.update({ where: { id }, data: { fullName, phone, email: newEmail } });
  await audit(admin.id, "customer.update", "Customer", id);
  revalidatePath("/admin/clientes");
  return { message: "Cliente actualizado.", values: { fullName, phone, email: newEmail ?? "" } };
}
