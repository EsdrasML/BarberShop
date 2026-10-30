"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BookingError, bookAppointment, cancelAppointment, rescheduleAppointment, suggestAlternatives } from "@/lib/booking";
import { getActiveBranches, resolveBranchId } from "@/lib/branches";
import { ensureCustomerForUser } from "@/lib/customers";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { firstErrors, phoneField } from "@/lib/validation/auth";
import { utcToLocalInputs } from "@/lib/tz";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const bookSchema = z.object({
  serviceId: z.string().min(1).max(40),
  barberId: z.string().min(1).max(40),
  startsAt: z.string().datetime(),
  phone: phoneField,
});

async function withSuggestions(e: BookingError, barberId: string, durationMinutes: number, startsAt: Date, excludeAppointmentId?: string): Promise<FormState> {
  if (e.code !== "SLOT_TAKEN") return { error: e.message };
  const shop = await getShop();
  const suggestions = await suggestAlternatives({
    barberId, fromDate: utcToLocalInputs(startsAt, shop.timezone).date, durationMinutes, leadMinutes: 30, excludeAppointmentId,
  });
  return { error: `${e.message} Elige otro de los horarios disponibles.`, suggestions };
}

export async function bookAppointmentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("CLIENT");
  const parsed = bookSchema.safeParse({ serviceId: str(fd, "serviceId"), barberId: str(fd, "barberId"), startsAt: str(fd, "startsAt"), phone: str(fd, "phone") });
  if (!parsed.success) {
    const errs = firstErrors(parsed.error);
    return errs.phone ? { fieldErrors: { phone: errs.phone } } : { error: "Elige servicio, barbero, fecha y hora." };
  }
  const { serviceId, barberId, phone } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);
  const branch = resolveBranchId(str(fd, "branchId"), await getActiveBranches());
  if (!branch.ok) return { error: branch.error };

  const customer = await ensureCustomerForUser(user);
  if (customer.phone !== phone) await db.customer.update({ where: { id: customer.id }, data: { phone } });

  try {
    await bookAppointment({ customerId: customer.id, branchId: branch.id, barberId, serviceId, startsAt, source: "ONLINE", actor: { id: user.id, role: "CLIENT" } });
  } catch (e) {
    if (e instanceof BookingError) {
      const service = await db.service.findUnique({ where: { id: serviceId }, select: { durationMinutes: true } });
      return withSuggestions(e, barberId, service?.durationMinutes ?? 50, startsAt);
    }
    throw e;
  }
  revalidatePath("/cliente/citas");
  redirect("/cliente/citas?aviso=reservada");
}

export async function rescheduleOwnAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole("CLIENT");
  const iso = z.string().datetime().safeParse(str(fd, "startsAt"));
  if (!iso.success) return { error: "Elige un horario." };
  const startsAt = new Date(iso.data);

  try {
    await rescheduleAppointment({ id, startsAt, actor: { id: user.id, role: "CLIENT" } });
  } catch (e) {
    if (e instanceof BookingError) {
      const appt = await db.appointment.findUnique({ where: { id }, select: { barberId: true, durationMinutes: true } });
      return appt ? withSuggestions(e, appt.barberId, appt.durationMinutes, startsAt, id) : { error: e.message };
    }
    throw e;
  }
  revalidatePath("/cliente/citas");
  redirect("/cliente/citas?aviso=reprogramada");
}

export async function cancelOwnAction(id: string) {
  const user = await requireRole("CLIENT");
  let aviso = "cancelada";
  try {
    await cancelAppointment(id, { id: user.id, role: "CLIENT" }, "Cancelada por el cliente");
  } catch (e) {
    if (e instanceof BookingError) aviso = e.code === "TOO_LATE" ? "fuera-de-plazo" : "no-cancelable";
    else throw e;
  }
  revalidatePath("/cliente/citas");
  redirect(`/cliente/citas?aviso=${aviso}`);
}

