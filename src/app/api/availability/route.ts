import { NextResponse } from "next/server";
import type { Interval } from "@/lib/availability";
import { z } from "zod";
import { externalBusyForDay } from "@/lib/calendar-sync";
import { CalendarUnavailableError } from "@/lib/google-calendar";
import { ADMIN_LEAD_MINUTES, ADMIN_MAX_DAYS, MAX_DAYS_AHEAD, MIN_LEAD_MINUTES, isBookableDate, slotsForDay, timeLabel } from "@/lib/booking";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShop } from "@/lib/shop";

export const dynamic = "force-dynamic";

const query = z.object({
  serviceId: z.string().min(1).max(40),
  barberId: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeId: z.string().max(40).optional(),
});

// Devuelve SOLO horarios libres: nunca detalles de otras citas ni de eventos externos.
export async function GET(req: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Parámetros no válidos." }, { status: 400 });
  const { serviceId, barberId, date, excludeId } = parsed.data;

  const [shop, user] = await Promise.all([getShop(), getCurrentUser()]);
  const barber = await db.barber.findUnique({ where: { id: barberId } });
  if (!barber || !barber.isActive || barber.deletedAt) return NextResponse.json({ slots: [] });

  let durationMinutes: number;
  if (excludeId) {
    // Reprogramación: se ignora la propia cita y se usa su duración acordada. Requiere ser su dueño o admin.
    if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const appt = await db.appointment.findUnique({ where: { id: excludeId }, include: { customer: { select: { userId: true } } } });
    if (!appt) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    if (user.role !== "ADMIN" && appt.customer.userId !== user.id) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    durationMinutes = appt.durationMinutes;
  } else {
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive || service.deletedAt) return NextResponse.json({ slots: [] });
    durationMinutes = service.durationMinutes;
  }

  const isAdmin = user?.role === "ADMIN";
  const now = new Date();
  if (!isBookableDate(date, shop.timezone, now, isAdmin ? ADMIN_MAX_DAYS : MAX_DAYS_AHEAD)) return NextResponse.json({ slots: [] });

  let externalBusy: Interval[];
  try {
    externalBusy = await externalBusyForDay(barberId, date, shop.timezone);
  } catch (e) {
    // No se pudo consultar el Google Calendar del barbero: no se ofrece ningún horario (no se asume libre).
    if (e instanceof CalendarUnavailableError) return NextResponse.json({ slots: [], unavailable: true });
    throw e;
  }
  const slots = await slotsForDay(db, {
    barberId, date, durationMinutes, stepMinutes: shop.slotStepMinutes, tz: shop.timezone,
    leadMinutes: isAdmin ? ADMIN_LEAD_MINUTES : MIN_LEAD_MINUTES, excludeAppointmentId: excludeId, now, externalBusy,
  });
  return NextResponse.json({ slots: slots.map((s) => ({ startsAt: s.startsAt.toISOString(), label: timeLabel(s.startsAt, shop.timezone) })) });
}
