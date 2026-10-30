"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { buildAbsenceRange } from "@/lib/absence";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import type { FormState } from "@/lib/form-state";
import { parseWeek } from "@/lib/schedule";
import { assertBarberAccess, isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { firstErrors } from "@/lib/validation/auth";
import { absenceSchema, barberSchema, inviteSchema } from "@/lib/validation/people";
import { issuePasswordToken } from "@/lib/verification";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const INVITE_TTL = 72 * 60 * 60 * 1000;
const ACTIVE = ["PENDING", "CONFIRMED", "IN_PROGRESS"] as const;

function readBarber(fd: FormData) {
  const values = { displayName: str(fd, "displayName"), bio: str(fd, "bio"), phone: str(fd, "phone"), email: str(fd, "email"), photoUrl: str(fd, "photoUrl") };
  return {
    values,
    branchIds: fd.getAll("branchIds").map(String),
    input: { ...values, isActive: fd.get("isActive") === "on", canRegisterPayments: fd.get("canRegisterPayments") === "on", canViewRevenue: fd.get("canViewRevenue") === "on" },
  };
}

export async function createBarberAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const { values, input, branchIds } = readBarber(fd);
  const parsed = barberSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const mine = isBranchScoped(admin) ? [admin.branchId!] : branchIds;
  const barber = await db.barber.create({ data: { ...parsed.data, branches: { connect: mine.map((id) => ({ id })) } } });
  await audit(admin.id, "barber.create", "Barber", barber.id, { name: barber.displayName });
  revalidatePath("/admin/barberos");
  redirect(`/admin/barberos/${barber.id}`);
}

export async function updateBarberAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, id);
  const { values, input, branchIds } = readBarber(fd);
  const parsed = barberSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const current = await db.barber.findFirst({ where: { id, deletedAt: null } });
  if (!current) return { error: "El barbero ya no existe." };
  await db.$transaction(async (tx) => {
    await tx.barber.update({ where: { id }, data: { ...parsed.data, ...(isBranchScoped(admin) ? {} : { branches: { set: branchIds.map((bid) => ({ id: bid })) } }) } });
    // El acceso al sistema sigue al estado del perfil: un barbero desactivado no puede entrar.
    if (current.userId) await tx.user.update({ where: { id: current.userId }, data: { isActive: parsed.data.isActive } });
  });
  await audit(admin.id, "barber.update", "Barber", id);
  revalidatePath("/admin/barberos");
  return { message: "Barbero guardado.", values };
}

export async function toggleBarberAction(id: string) {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, id);
  const b = await db.barber.findFirst({ where: { id, deletedAt: null } });
  if (!b) return;
  // Desactivar NO borra citas, ventas ni estadísticas: solo deja de ser reservable y de poder entrar.
  await db.$transaction(async (tx) => {
    await tx.barber.update({ where: { id }, data: { isActive: !b.isActive } });
    if (b.userId) await tx.user.update({ where: { id: b.userId }, data: { isActive: !b.isActive } });
  });
  await audit(admin.id, b.isActive ? "barber.deactivate" : "barber.activate", "Barber", id);
  revalidatePath("/admin/barberos");
}

/** Crea la cuenta del barbero (rol BARBER, sin contraseña) y le envía el enlace para crearla. */
export async function inviteBarberAction(barberId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  const parsed = inviteSchema.safeParse({ email: str(fd, "email") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values: { email: str(fd, "email") } };
  const { email } = parsed.data;

  const barber = await db.barber.findFirst({ where: { id: barberId, deletedAt: null } });
  if (!barber) return { error: "El barbero ya no existe." };
  if (barber.userId) return { error: "Este barbero ya tiene acceso. Usa «Reenviar invitación»." };
  if (await db.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: "Ese correo ya tiene una cuenta en el sistema." }, values: { email } };
  }

  let user: { id: string };
  try {
    user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name: barber.displayName, email, phone: barber.phone, role: "BARBER", isActive: barber.isActive } });
      await tx.barber.update({ where: { id: barberId }, data: { userId: u.id, email: barber.email ?? email } });
      return u;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { email: "Ese correo ya tiene una cuenta en el sistema." }, values: { email } };
    }
    throw e;
  }
  const token = await issuePasswordToken(user.id, INVITE_TTL);
  await sendInvitationEmail(email, barber.displayName, `${process.env.AUTH_URL ?? "http://localhost:3000"}/restablecer?token=${token}`);
  await audit(admin.id, "barber.invite", "Barber", barberId, { email });
  revalidatePath(`/admin/barberos/${barberId}`);
  return { message: `Invitación enviada a ${email}.` };
}

export async function resendInviteAction(barberId: string, _prev: FormState): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  const barber = await db.barber.findFirst({ where: { id: barberId, deletedAt: null }, include: { user: true } });
  if (!barber?.user) return { error: "Este barbero aún no tiene cuenta." };
  if (barber.user.passwordHash) return { error: "Ya creó su contraseña." };
  const token = await issuePasswordToken(barber.user.id, INVITE_TTL);
  await sendInvitationEmail(barber.user.email, barber.displayName, `${process.env.AUTH_URL ?? "http://localhost:3000"}/restablecer?token=${token}`);
  await audit(admin.id, "barber.reinvite", "Barber", barberId);
  return { message: `Invitación reenviada a ${barber.user.email}.` };
}

export async function saveScheduleAction(barberId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  const barber = await db.barber.findFirst({ where: { id: barberId, deletedAt: null }, select: { id: true } });
  if (!barber) return { error: "El barbero ya no existe." };

  const values = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = parseWeek((k) => values[k] ?? "");
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  // Las citas ya reservadas no se tocan; el horario nuevo rige para las reservas futuras.
  await db.$transaction([
    db.workingHours.deleteMany({ where: { barberId } }),
    db.workingHours.createMany({ data: parsed.blocks.map((b) => ({ ...b, barberId })) }),
  ]);
  await audit(admin.id, "barber.schedule_update", "Barber", barberId, { blocks: parsed.blocks.length });
  revalidatePath(`/admin/barberos/${barberId}/horario`);
  return { message: "Horario guardado. Las citas ya reservadas no se modifican.", values };
}

// ───── Ausencias ─────
function readAbsence(fd: FormData) {
  const values = {
    type: str(fd, "type") || "OTHER", startDate: str(fd, "startDate"), endDate: str(fd, "endDate"),
    startTime: str(fd, "startTime"), endTime: str(fd, "endTime"), reason: str(fd, "reason"),
  };
  return { values: { ...values, allDay: fd.get("allDay") === "on" ? "on" : "" }, input: { ...values, allDay: fd.get("allDay") === "on" } };
}

async function countAffected(barberId: string, startsAt: Date, endsAt: Date) {
  return db.appointment.count({ where: { barberId, status: { in: [...ACTIVE] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
}

export async function createAbsenceAction(barberId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  const { values, input } = readAbsence(fd);
  const parsed = absenceSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const barber = await db.barber.findFirst({ where: { id: barberId, deletedAt: null }, select: { id: true } });
  if (!barber) return { error: "El barbero ya no existe.", values };

  const shop = await getShop();
  const range = buildAbsenceRange(parsed.data, shop.timezone);
  if (!range.ok) return { fieldErrors: { [range.field]: range.error }, values };

  const { allDay, type, reason } = parsed.data;
  const absence = await db.absence.create({ data: { barberId, type, allDay, reason, startsAt: range.startsAt, endsAt: range.endsAt, createdById: admin.id } });
  await audit(admin.id, "absence.create", "Absence", absence.id, { barberId });
  const affected = await countAffected(barberId, range.startsAt, range.endsAt);
  revalidatePath(`/admin/barberos/${barberId}/ausencias`);
  return {
    message: affected > 0
      ? `Ausencia registrada. ¡Atención! ${affected} cita(s) ya reservadas coinciden con este periodo; NO se cancelaron. Revísalas y decide si reprogramar, reasignar o cancelar.`
      : "Ausencia registrada. No hay citas afectadas.",
  };
}

export async function updateAbsenceAction(barberId: string, absenceId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  const { values, input } = readAbsence(fd);
  const parsed = absenceSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const current = await db.absence.findFirst({ where: { id: absenceId, barberId, status: "ACTIVE" } });
  if (!current) return { error: "La ausencia ya no existe o fue cancelada.", values };

  const shop = await getShop();
  const range = buildAbsenceRange(parsed.data, shop.timezone);
  if (!range.ok) return { fieldErrors: { [range.field]: range.error }, values };

  const { allDay, type, reason } = parsed.data;
  await db.absence.update({ where: { id: absenceId }, data: { type, allDay, reason, startsAt: range.startsAt, endsAt: range.endsAt } });
  await audit(admin.id, "absence.update", "Absence", absenceId, { barberId });
  const affected = await countAffected(barberId, range.startsAt, range.endsAt);
  revalidatePath(`/admin/barberos/${barberId}/ausencias`);
  return {
    message: affected > 0 ? `Ausencia actualizada. ${affected} cita(s) ya reservadas coinciden; no se cancelaron.` : "Ausencia actualizada.",
    values,
  };
}

export async function cancelAbsenceAction(barberId: string, absenceId: string) {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  // Eliminación lógica: queda en el historial; la disponibilidad del barbero se recalcula sola.
  await db.absence.updateMany({ where: { id: absenceId, barberId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
  await audit(admin.id, "absence.cancel", "Absence", absenceId, { barberId });
  revalidatePath(`/admin/barberos/${barberId}/ausencias`);
}
