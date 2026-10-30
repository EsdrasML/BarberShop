"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import type { FormState } from "@/lib/form-state";
import { requireOwner } from "@/lib/session";
import { firstErrors } from "@/lib/validation/auth";
import { adminSchema } from "@/lib/validation/admins";
import { issuePasswordToken } from "@/lib/verification";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const INVITE_TTL = 72 * 60 * 60 * 1000;
const link = (token: string) => `${process.env.AUTH_URL ?? "http://localhost:3000"}/restablecer?token=${token}`;

// Solo el propietario crea administradores: así cada sucursal tiene el suyo y nadie se auto-asigna permisos.
export async function createAdminAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const values = { name: str(fd, "name"), email: str(fd, "email"), branchId: str(fd, "branchId") };
  const parsed = adminSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const { name, email, branchId } = parsed.data;

  if (branchId && !(await db.branch.findUnique({ where: { id: branchId }, select: { id: true } }))) {
    return { fieldErrors: { branchId: "La sucursal no existe." }, values };
  }
  if (await db.user.findUnique({ where: { email } })) return { fieldErrors: { email: "Ese correo ya tiene una cuenta en el sistema." }, values };

  let id: string;
  try {
    id = (await db.user.create({ data: { name, email, role: "ADMIN", branchId: branchId || null, isActive: true } })).id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { fieldErrors: { email: "Ese correo ya tiene una cuenta en el sistema." }, values };
    throw e;
  }
  const token = await issuePasswordToken(id, INVITE_TTL);
  const url = link(token);
  const sent = await sendInvitationEmail(email, name, url, "administrador");
  await audit(owner.id, "admin.create", "User", id, { email, branchId: branchId || null, emailSent: sent.ok });
  revalidatePath("/admin/administradores");
  if (!sent.ok) {
    // La cuenta quedó creada: se muestra el enlace para enviarlo a mano (WhatsApp, etc.) y se explica el motivo.
    return { error: `La cuenta se creó, pero el correo NO se envió (${sent.detail ?? "el envío de correos no está configurado"}). Copia este enlace y envíaselo a ${email}; vence en 72 horas.`, link: url };
  }
  redirect("/admin/administradores?invitado=1");
}

export async function updateAdminAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  if (id === owner.id) return { error: "No puedes modificar tu propia cuenta desde aquí." };
  const target = await db.user.findFirst({ where: { id, role: "ADMIN" } });
  if (!target) return { error: "El administrador ya no existe." };

  const branchId = str(fd, "branchId");
  if (branchId && !(await db.branch.findUnique({ where: { id: branchId }, select: { id: true } }))) return { fieldErrors: { branchId: "La sucursal no existe." } };
  const isActive = fd.get("isActive") === "on";
  await db.user.update({ where: { id }, data: { branchId: branchId || null, isActive } });
  await audit(owner.id, "admin.update", "User", id, { branchId: branchId || null, isActive });
  revalidatePath("/admin/administradores");
  return { message: "Administrador guardado." };
}

export async function resendAdminInviteAction(id: string, _prev: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const u = await db.user.findFirst({ where: { id, role: "ADMIN" } });
  if (!u) return { error: "El administrador ya no existe." };
  if (u.passwordHash) return { error: "Ya creó su contraseña." };
  const token = await issuePasswordToken(u.id, INVITE_TTL);
  const url = link(token);
  const sent = await sendInvitationEmail(u.email, u.name, url, "administrador");
  await audit(owner.id, "admin.reinvite", "User", id, { emailSent: sent.ok });
  if (!sent.ok) return { error: `El correo NO se envió (${sent.detail ?? "el envío de correos no está configurado"}). Copia este enlace y envíaselo a ${u.email}; vence en 72 horas.`, link: url };
  return { message: `Invitación enviada a ${u.email}.` };
}
