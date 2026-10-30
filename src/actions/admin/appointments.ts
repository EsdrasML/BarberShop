"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Status } from "@/lib/appointment-status";
import { audit } from "@/lib/audit";
import { BookingError, bookAppointment, cancelAppointment, changeAppointmentStatus, rescheduleAppointment, suggestAlternatives, ADMIN_LEAD_MINUTES } from "@/lib/booking";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { assertAppointmentAccess, assertBarberAccess, resolveAdminBranch } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs } from "@/lib/tz";
import { firstErrors } from "@/lib/validation/auth";
import { customerSchema } from "@/lib/validation/people";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const iso = z.string().datetime();

async function suggest(e: BookingError, barberId: string, durationMinutes: number, startsAt: Date, excludeAppointmentId?: string): Promise<FormState> {
  if (e.code !== "SLOT_TAKEN") return { error: e.message };
  const shop = await getShop();
  const suggestions = await suggestAlternatives({ barberId, fromDate: utcToLocalInputs(startsAt, shop.timezone).date, durationMinutes, leadMinutes: ADMIN_LEAD_MINUTES, excludeAppointmentId });
  return { error: `${e.message} Estas son las opciones más cercanas.`, suggestions };
}

/** Cita registrada por el administrador (cliente que no usa el sistema). Mismas reglas que la reserva pública. */
export async function createManualAppointmentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const values = {
    mode: str(fd, "mode") || "existing", customerId: str(fd, "customerId"), fullName: str(fd, "fullName"), phone: str(fd, "phone"),
    email: str(fd, "email"), serviceId: str(fd, "serviceId"), barberId: str(fd, "barberId"), notes: str(fd, "notes").slice(0, 300),
  };
  const when = iso.safeParse(str(fd, "startsAt"));
  if (!values.serviceId || !values.barberId || !when.success) return { error: "Elige servicio, barbero, fecha y hora.", values };
  const startsAt = new Date(when.data);
  const branch = await resolveAdminBranch(admin, str(fd, "branchId"));
  if (!branch.ok) return { error: branch.error, values };
  await assertBarberAccess(admin, str(fd, "barberId"));

  let customerId: string | undefined;
  let newCustomer: { fullName: string; phone: string; email: string | null } | undefined;
  if (values.mode === "new") {
    const parsed = customerSchema.safeParse({ fullName: values.fullName, phone: values.phone, email: values.email });
    if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
    if (parsed.data.email) {
      const dup = await db.customer.findFirst({ where: { email: { equals: parsed.data.email, mode: "insensitive" } }, select: { id: true } });
      if (dup) return { fieldErrors: { email: "Ya existe un cliente con ese correo. Búscalo como cliente existente." }, values };
    }
    newCustomer = parsed.data;
  } else {
    const c = await db.customer.findUnique({ where: { id: values.customerId }, select: { id: true } });
    if (!c) return { error: "Selecciona un cliente.", values };
    customerId = c.id;
  }

  try {
    const appt = await bookAppointment({ customerId, newCustomer, branchId: branch.id, barberId: values.barberId, serviceId: values.serviceId, startsAt, source: "ADMIN", actor: { id: admin.id, role: "ADMIN" }, notes: values.notes || null });
    await audit(admin.id, "appointment.create_manual", "Appointment", appt.id);
    revalidatePath("/admin/citas");
    redirect(`/admin/citas/${appt.id}?ok=creada`);
  } catch (e) {
    if (e instanceof BookingError) {
      const service = await db.service.findUnique({ where: { id: values.serviceId }, select: { durationMinutes: true } });
      return { ...(await suggest(e, values.barberId, service?.durationMinutes ?? 50, startsAt)), values };
    }
    throw e; // incluye la redirección de éxito
  }
}

export async function adminRescheduleAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertAppointmentAccess(admin, id);
  if (str(fd, "barberId")) await assertBarberAccess(admin, str(fd, "barberId"));
  const when = iso.safeParse(str(fd, "startsAt"));
  if (!when.success) return { error: "Elige un horario." };
  const startsAt = new Date(when.data);
  const barberId = str(fd, "barberId") || undefined;

  try {
    await rescheduleAppointment({ id, startsAt, barberId, actor: { id: admin.id, role: "ADMIN" } });
    await audit(admin.id, "appointment.reschedule", "Appointment", id);
    revalidatePath("/admin/citas");
    redirect(`/admin/citas/${id}?ok=reprogramada`);
  } catch (e) {
    if (e instanceof BookingError) {
      const appt = await db.appointment.findUnique({ where: { id }, select: { barberId: true, durationMinutes: true } });
      return appt ? suggest(e, barberId ?? appt.barberId, appt.durationMinutes, startsAt, id) : { error: e.message };
    }
    throw e;
  }
}

function back(id: string, e: unknown): never {
  if (e instanceof BookingError) redirect(`/admin/citas/${id}?error=${encodeURIComponent(e.message)}`);
  throw e;
}

export async function adminStatusAction(id: string, to: Status) {
  const admin = await requireRole("ADMIN");
  await assertAppointmentAccess(admin, id);
  try {
    await changeAppointmentStatus(id, to, { id: admin.id, role: "ADMIN" });
    await audit(admin.id, "appointment.status", "Appointment", id, { to });
  } catch (e) {
    back(id, e);
  }
  revalidatePath("/admin/citas");
  redirect(`/admin/citas/${id}?ok=estado`);
}

export async function adminCancelAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertAppointmentAccess(admin, id);
  const reason = str(fd, "reason").trim().slice(0, 200) || null;
  try {
    await cancelAppointment(id, { id: admin.id, role: "ADMIN" }, reason);
    await audit(admin.id, "appointment.cancel", "Appointment", id, { reason });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/citas");
  redirect(`/admin/citas/${id}?ok=cancelada`);
}
