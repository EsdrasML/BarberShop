"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireRole, requireUser } from "@/lib/session";
import { changePasswordSchema, profileSchema } from "@/lib/validation/account";
import { firstErrors } from "@/lib/validation/auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("CLIENT"); // la identidad sale de la sesión, nunca del formulario
  const values = { fullName: str(fd, "fullName"), phone: str(fd, "phone") };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { fullName, phone } = parsed.data;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name: fullName, phone } }),
    db.customer.upsert({
      where: { userId: user.id },
      update: { fullName, phone },
      create: { userId: user.id, fullName, phone, email: user.email },
    }),
  ]);
  revalidatePath("/", "layout");
  return { message: "Datos actualizados.", values: { fullName, phone } };
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: str(fd, "currentPassword"),
    password: str(fd, "password"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  // Quien ya tiene contraseña debe confirmarla; una cuenta creada solo con Google puede definir la primera.
  if (row?.passwordHash) {
    const ok = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash);
    if (!ok) return { fieldErrors: { currentPassword: "La contraseña actual no es correcta." } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  return { message: "Contraseña actualizada." };
}
