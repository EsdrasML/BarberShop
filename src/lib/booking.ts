import type { Prisma } from "@prisma/client";
import { OPEN, BLOCKING, canTransition, startedEnough, type Status } from "@/lib/appointment-status";
import { computeSlots, weekdayOf, type Interval, type Slot } from "@/lib/availability";
import { barberServesBranch } from "@/lib/branches";
import { externalBusyForDay, scheduleSync } from "@/lib/calendar-sync";
import { db } from "@/lib/db";
import { CalendarUnavailableError } from "@/lib/google-calendar";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs, zonedToUtc } from "@/lib/tz";

export const MIN_LEAD_MINUTES = 30; // antelación mínima para reservas en línea
export const MAX_DAYS_AHEAD = 60; // horizonte de reservas en línea
export const ADMIN_LEAD_MINUTES = -30; // el administrador puede registrar a quien ya llegó
export const ADMIN_MAX_DAYS = 365;

export class BookingError extends Error {
  constructor(public code: "NOT_FOUND" | "SLOT_TAKEN" | "INVALID" | "CUSTOMER_BUSY" | "TOO_LATE" | "FORBIDDEN", message: string) {
    super(message);
  }
}

type Client = Prisma.TransactionClient; // el cliente normal (db) también cumple este tipo
export type Actor = { id: string; role: "ADMIN" | "CLIENT" | "BARBER" };

const dayParts = (date: string) => date.split("-").map(Number) as [number, number, number];

export function isBookableDate(date: string, tz: string, now: Date, maxDays: number) {
  const today = utcToLocalInputs(now, tz).date;
  if (date < today) return false;
  const [ty, tm, td] = dayParts(today);
  const [y, m, d] = dayParts(date);
  return (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000 <= maxDays;
}

export const timeLabel = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(d);

export const dateTimeLabel = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("es-GT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(d);

/** Lo que ocupa al barbero ese día: citas vigentes y ausencias. (Fase 7: eventos de Google Calendar.) */
async function loadBusy(client: Client, barberId: string, from: Date, to: Date, excludeId?: string): Promise<Interval[]> {
  const [appts, absences] = await Promise.all([
    client.appointment.findMany({
      where: { barberId, status: { in: BLOCKING }, startsAt: { lt: to }, endsAt: { gt: from }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { startsAt: true, endsAt: true },
    }),
    client.absence.findMany({
      where: { barberId, status: "ACTIVE", startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return [...appts, ...absences].map((x) => ({ start: x.startsAt, end: x.endsAt }));
}

export async function slotsForDay(
  client: Client,
  a: { barberId: string; date: string; durationMinutes: number; stepMinutes: number; tz: string; leadMinutes: number; excludeAppointmentId?: string; now?: Date; externalBusy?: Interval[] },
): Promise<Slot[]> {
  const blocks = await client.workingHours.findMany({
    where: { barberId: a.barberId, weekday: weekdayOf(a.date) },
    select: { startMinute: true, endMinute: true },
  });
  if (blocks.length === 0) return [];
  const [y, m, d] = dayParts(a.date);
  const busy = [...(await loadBusy(client, a.barberId, zonedToUtc(y, m, d, 0, 0, a.tz), zonedToUtc(y, m, d + 1, 0, 0, a.tz), a.excludeAppointmentId)), ...(a.externalBusy ?? [])];
  return computeSlots({ date: a.date, tz: a.tz, durationMinutes: a.durationMinutes, stepMinutes: a.stepMinutes, blocks, busy, now: a.now ?? new Date(), leadMinutes: a.leadMinutes });
}

/** Próximos horarios libres a partir de una fecha (para sugerir alternativas). */
export async function suggestAlternatives(a: { barberId: string; fromDate: string; durationMinutes: number; leadMinutes: number; excludeAppointmentId?: string; max?: number }) {
  const shop = await getShop();
  const out: Array<{ startsAt: string; label: string }> = [];
  const [y, m, d] = dayParts(a.fromDate);
  for (let i = 0; i < 7 && out.length < (a.max ?? 5); i++) {
    const date = utcToLocalInputs(new Date(Date.UTC(y, m - 1, d + i, 12)), "UTC").date;
    let externalBusy: Interval[];
    try { externalBusy = await externalBusyForDay(a.barberId, date, shop.timezone); } catch { continue; } // sin poder consultar Google, ese día no se sugiere
    const slots = await slotsForDay(db, { barberId: a.barberId, date, durationMinutes: a.durationMinutes, stepMinutes: shop.slotStepMinutes, tz: shop.timezone, leadMinutes: a.leadMinutes, excludeAppointmentId: a.excludeAppointmentId, externalBusy });
    for (const s of slots) {
      if (out.length >= (a.max ?? 5)) break;
      out.push({ startsAt: s.startsAt.toISOString(), label: dateTimeLabel(s.startsAt, shop.timezone) });
    }
  }
  return out;
}

const isOverlapViolation = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Appointment_no_overlap") || msg.includes("23P01");
};

/** Eventos de Google del barbero ese día. Si no se puede consultar, la reserva se detiene (no se asume libre). */
async function externalFor(barberId: string, date: string, tz: string): Promise<Interval[]> {
  try {
    return await externalBusyForDay(barberId, date, tz);
  } catch (e) {
    if (e instanceof CalendarUnavailableError) throw new BookingError("INVALID", "No pudimos verificar la agenda del barbero en este momento. Inténtalo de nuevo en unos minutos.");
    throw e;
  }
}

async function lockBarber(tx: Prisma.TransactionClient, barberId: string) {
  // Un barbero a la vez: las reservas simultáneas del mismo barbero se serializan.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${barberId}))`;
}

export type NewCustomer = { fullName: string; phone: string; email: string | null };

export async function bookAppointment(input: {
  customerId?: string;
  newCustomer?: NewCustomer;
  branchId?: string | null;
  barberId: string;
  serviceId: string;
  startsAt: Date;
  source: "ONLINE" | "ADMIN" | "BARBER";
  actor: Actor;
  notes?: string | null;
}) {
  const shop = await getShop();
  const now = new Date();
  const admin = input.actor.role !== "CLIENT";
  const lead = admin ? ADMIN_LEAD_MINUTES : MIN_LEAD_MINUTES;

  const [service, barber] = await Promise.all([
    db.service.findUnique({ where: { id: input.serviceId } }),
    db.barber.findUnique({ where: { id: input.barberId }, include: { branches: { select: { id: true } } } }),
  ]);
  if (!service || !service.isActive || service.deletedAt) throw new BookingError("NOT_FOUND", "El servicio no está disponible.");
  if (!barber || !barber.isActive || barber.deletedAt) throw new BookingError("NOT_FOUND", "El barbero no está disponible.");
  if (!barberServesBranch(barber.branches.map((b) => b.id), input.branchId ?? null)) {
    throw new BookingError("INVALID", "Ese barbero no atiende en la sucursal elegida.");
  }

  const startsAt = input.startsAt;
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
  const date = utcToLocalInputs(startsAt, shop.timezone).date;
  if (!isBookableDate(date, shop.timezone, now, admin ? ADMIN_MAX_DAYS : MAX_DAYS_AHEAD)) {
    throw new BookingError("INVALID", "Esa fecha está fuera del rango de reservas.");
  }

  const externalBusy = await externalFor(barber.id, date, shop.timezone);
  let created: Awaited<ReturnType<typeof db.appointment.create>>;
  try {
    created = await db.$transaction(
      async (tx) => {
        await lockBarber(tx, barber.id);
        const slots = await slotsForDay(tx, { barberId: barber.id, date, durationMinutes: service.durationMinutes, stepMinutes: shop.slotStepMinutes, tz: shop.timezone, leadMinutes: lead, now, externalBusy });
        if (!slots.some((s) => s.startsAt.getTime() === startsAt.getTime())) throw new BookingError("SLOT_TAKEN", "Ese horario ya no está disponible.");

        let customerId = input.customerId;
        if (customerId) {
          const clash = await tx.appointment.findFirst({
            where: { customerId, status: { in: OPEN }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
            select: { id: true },
          });
          if (clash) throw new BookingError("CUSTOMER_BUSY", "Este cliente ya tiene otra cita en ese horario.");
        } else if (input.newCustomer) {
          customerId = (await tx.customer.create({ data: input.newCustomer })).id;
        } else {
          throw new BookingError("INVALID", "Falta el cliente.");
        }

        // Precio y duración quedan fijados en la cita: cambios posteriores del catálogo no la alteran.
        const appt = await tx.appointment.create({
          data: {
            customerId, barberId: barber.id, branchId: input.branchId ?? null, serviceId: service.id, startsAt, endsAt, status: "CONFIRMED", source: input.source,
            priceCents: service.priceCents, durationMinutes: service.durationMinutes, notes: input.notes ?? null, createdById: input.actor.id,
          },
        });
        await tx.appointmentStatusHistory.create({
          data: { appointmentId: appt.id, fromStatus: null, toStatus: "CONFIRMED", changedById: input.actor.id, note: "Reserva creada" },
        });
        return appt;
      },
      { timeout: 15_000 },
    );
  } catch (e) {
    if (isOverlapViolation(e)) throw new BookingError("SLOT_TAKEN", "Ese horario ya no está disponible.");
    throw e;
  }
  scheduleSync(created.id); // crea el evento en el Google Calendar del barbero (si lo conectó)
  return created;
}

async function loadForChange(id: string) {
  const appt = await db.appointment.findUnique({ where: { id }, include: { customer: { select: { userId: true } } } });
  if (!appt) throw new BookingError("NOT_FOUND", "La cita no existe.");
  return appt;
}

async function assertNoPaidSale(appointmentId: string) {
  const sale = await db.sale.findFirst({ where: { appointmentId, status: { not: "VOID" } }, select: { id: true } });
  if (sale) throw new BookingError("INVALID", "La cita tiene una venta registrada. Anula primero la venta.");
}

/** El cliente solo cambia su cita hasta `cancellationMinutes` antes de la hora. */
async function assertClientWindow(appt: { startsAt: Date; customer: { userId: string | null } }, actor: Actor) {
  if (actor.role !== "CLIENT") return;
  if (appt.customer.userId !== actor.id) throw new BookingError("FORBIDDEN", "Esta cita no es tuya.");
  const shop = await getShop();
  if (Date.now() > appt.startsAt.getTime() - shop.cancellationMinutes * 60_000) {
    throw new BookingError("TOO_LATE", `Solo puedes cambiar tu cita hasta ${shop.cancellationMinutes / 60} h antes. Comunícate con la barbería.`);
  }
}

export async function cancelAppointment(id: string, actor: Actor, reason?: string | null) {
  const appt = await loadForChange(id);
  if (actor.role === "BARBER") throw new BookingError("FORBIDDEN", "No tienes permiso para cancelar esta cita.");
  if (!canTransition(appt.status as Status, "CANCELLED")) throw new BookingError("INVALID", "Esta cita ya no se puede cancelar.");
  await assertClientWindow(appt, actor);
  await assertNoPaidSale(id);

  await db.$transaction([
    db.appointment.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason ?? null } }),
    db.appointmentStatusHistory.create({ data: { appointmentId: id, fromStatus: appt.status, toStatus: "CANCELLED", changedById: actor.id, note: reason ?? null } }),
  ]);
  scheduleSync(id); // elimina el evento de Google Calendar. La cancelación libera el horario (las consultas ignoran CANCELLED).
}

export async function changeAppointmentStatus(id: string, to: Status, actor: Actor) {
  if (to === "CANCELLED") return cancelAppointment(id, actor);
  if (actor.role === "CLIENT") throw new BookingError("FORBIDDEN", "No tienes permiso para esta acción.");
  const appt = await loadForChange(id);
  if (!canTransition(appt.status as Status, to)) throw new BookingError("INVALID", "Ese cambio de estado no es válido.");
  if (!startedEnough(to, appt.startsAt, new Date())) throw new BookingError("INVALID", "Aún no llega la hora de esta cita.");

  await db.$transaction([
    db.appointment.update({ where: { id }, data: { status: to, ...(to === "COMPLETED" ? { completedAt: new Date() } : {}) } }),
    db.appointmentStatusHistory.create({ data: { appointmentId: id, fromStatus: appt.status, toStatus: to, changedById: actor.id } }),
  ]);
  // Fase 8: al completar se ofrece el cobro; los puntos se otorgan una sola vez al registrar el pago.
}

export async function rescheduleAppointment(input: { id: string; startsAt: Date; barberId?: string; actor: Actor }) {
  const appt = await loadForChange(input.id);
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") throw new BookingError("INVALID", "Solo se reprograman citas pendientes o confirmadas.");
  await assertClientWindow(appt, input.actor);
  await assertNoPaidSale(input.id);

  const shop = await getShop();
  const admin = input.actor.role === "ADMIN";
  const barberId = admin && input.barberId ? input.barberId : appt.barberId;
  const barber = await db.barber.findUnique({ where: { id: barberId }, include: { branches: { select: { id: true } } } });
  if (!barber || !barber.isActive || barber.deletedAt) throw new BookingError("NOT_FOUND", "El barbero no está disponible.");
  if (!barberServesBranch(barber.branches.map((b) => b.id), appt.branchId)) throw new BookingError("INVALID", "Ese barbero no atiende en la sucursal de la cita.");

  const startsAt = input.startsAt;
  const endsAt = new Date(startsAt.getTime() + appt.durationMinutes * 60_000); // se conserva la duración acordada
  if (startsAt.getTime() === appt.startsAt.getTime() && barberId === appt.barberId) throw new BookingError("INVALID", "Elige un horario distinto al actual.");
  const date = utcToLocalInputs(startsAt, shop.timezone).date;
  if (!isBookableDate(date, shop.timezone, new Date(), admin ? ADMIN_MAX_DAYS : MAX_DAYS_AHEAD)) throw new BookingError("INVALID", "Esa fecha está fuera del rango de reservas.");

  const externalBusy = await externalFor(barberId, date, shop.timezone);
  let moved: Awaited<ReturnType<typeof db.appointment.update>>;
  try {
    moved = await db.$transaction(
      async (tx) => {
        await lockBarber(tx, barberId);
        const slots = await slotsForDay(tx, { barberId, date, durationMinutes: appt.durationMinutes, stepMinutes: shop.slotStepMinutes, tz: shop.timezone, leadMinutes: admin ? ADMIN_LEAD_MINUTES : MIN_LEAD_MINUTES, excludeAppointmentId: appt.id, externalBusy });
        if (!slots.some((s) => s.startsAt.getTime() === startsAt.getTime())) throw new BookingError("SLOT_TAKEN", "Ese horario ya no está disponible.");
        const clash = await tx.appointment.findFirst({
          where: { customerId: appt.customerId, id: { not: appt.id }, status: { in: OPEN }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
          select: { id: true },
        });
        if (clash) throw new BookingError("CUSTOMER_BUSY", "Este cliente ya tiene otra cita en ese horario.");

        const updated = await tx.appointment.update({ where: { id: appt.id }, data: { startsAt, endsAt, barberId } });
        await tx.appointmentStatusHistory.create({
          data: {
            appointmentId: appt.id, fromStatus: appt.status, toStatus: appt.status, changedById: input.actor.id,
            note: `Reprogramada: ${dateTimeLabel(appt.startsAt, shop.timezone)} → ${dateTimeLabel(startsAt, shop.timezone)}`,
          },
        });
        return updated;
      },
      { timeout: 15_000 },
    );
  } catch (e) {
    if (isOverlapViolation(e)) throw new BookingError("SLOT_TAKEN", "Ese horario ya no está disponible.");
    throw e;
  }
  scheduleSync(moved.id, { previousBarberId: appt.barberId }); // actualiza el evento (o lo mueve de calendario) sin duplicarlo
  return moved;
}
