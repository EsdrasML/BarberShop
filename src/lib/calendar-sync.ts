import { after } from "next/server";
import type { Interval } from "@/lib/availability";
import { db } from "@/lib/db";
import {
  CalendarError, CalendarUnavailableError, calendarConfigured, deleteEvent, eventIdFor, listExternalBusy, upsertEvent,
} from "@/lib/google-calendar";
import { getShop } from "@/lib/shop";
import { zonedToUtc } from "@/lib/tz";

export type SyncResult = { state: "synced" | "deleted" | "skipped" | "failed"; error?: string };

const msg = (e: unknown) => (e instanceof Error ? e.message : "Error desconocido");

/**
 * Sincroniza una cita con el Google Calendar de su barbero (si lo conectó).
 *  - cita vigente → crea o actualiza su evento (id determinista: reintentar no duplica)
 *  - cancelada / no asistió → elimina el evento
 * Nunca lanza: un fallo de Google no debe romper la reserva; queda registrado y se puede reintentar.
 */
export async function syncAppointment(id: string, opts: { previousBarberId?: string } = {}): Promise<SyncResult> {
  try {
    const a = await db.appointment.findUnique({
      where: { id },
      include: { customer: true, service: true, calendarEvent: true, barber: { include: { googleConnection: true } } },
    });
    if (!a) return { state: "skipped" };
    const eventId = eventIdFor(a.id);

    // Si cambió de barbero, el evento sale del calendario del anterior.
    if (opts.previousBarberId && opts.previousBarberId !== a.barberId) {
      const prev = await db.googleConnection.findUnique({ where: { barberId: opts.previousBarberId } });
      if (prev && prev.status !== "DISCONNECTED") await deleteEvent(prev.id, prev.calendarId, eventId).catch(() => undefined);
    }

    const conn = a.barber.googleConnection;
    if (!conn || conn.status === "DISCONNECTED" || !calendarConfigured()) return { state: "skipped" };

    if (a.status === "CANCELLED" || a.status === "NO_SHOW") {
      if (!a.calendarEvent) return { state: "skipped" };
      await deleteEvent(conn.id, a.calendarEvent.calendarId, a.calendarEvent.googleEventId);
      await db.calendarEvent.update({ where: { appointmentId: a.id }, data: { syncStatus: "DELETED", lastError: null, lastSyncAt: new Date() } });
      return { state: "deleted" };
    }

    const shop = await getShop();
    // Solo lo necesario del cliente: nombre y teléfono.
    await upsertEvent(conn.id, conn.calendarId, eventId, {
      summary: `${a.service.name} · ${a.customer.fullName}`,
      description: `Cliente: ${a.customer.fullName}${a.customer.phone ? `\nTeléfono: ${a.customer.phone}` : ""}\nCita ${a.id}`,
      start: a.startsAt, end: a.endsAt, timeZone: shop.timezone, appointmentId: a.id,
    });
    await db.calendarEvent.upsert({
      where: { appointmentId: a.id },
      update: { calendarId: conn.calendarId, googleEventId: eventId, syncStatus: "SYNCED", attempts: { increment: 1 }, lastError: null, lastSyncAt: new Date() },
      create: { appointmentId: a.id, calendarId: conn.calendarId, googleEventId: eventId, syncStatus: "SYNCED", attempts: 1, lastSyncAt: new Date() },
    });
    await db.googleConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date(), lastError: null } });
    return { state: "synced" };
  } catch (e) {
    const error = e instanceof CalendarError && e.kind === "auth" ? "El permiso de Google venció o fue revocado: hay que volver a conectar el calendario." : msg(e);
    console.error("Sincronización con Google Calendar falló:", id, error);
    const a = await db.appointment.findUnique({ where: { id }, include: { barber: { include: { googleConnection: true } } } }).catch(() => null);
    const conn = a?.barber.googleConnection;
    if (a && conn) {
      await db.calendarEvent.upsert({
        where: { appointmentId: id },
        update: { syncStatus: "FAILED", attempts: { increment: 1 }, lastError: error.slice(0, 300) },
        create: { appointmentId: id, calendarId: conn.calendarId, googleEventId: eventIdFor(id), syncStatus: "FAILED", attempts: 1, lastError: error.slice(0, 300) },
      }).catch(() => undefined);
    }
    return { state: "failed", error };
  }
}

/** Programa la sincronización para después de responder al usuario (sin hacerlo esperar). */
export function scheduleSync(id: string, opts: { previousBarberId?: string } = {}) {
  try {
    after(() => syncAppointment(id, opts));
  } catch {
    void syncAppointment(id, opts); // fuera de una petición (por ejemplo en pruebas)
  }
}

/** Tras conectar un calendario: sube las citas futuras que aún no estén en él. */
export async function resyncBarber(barberId: string) {
  const upcoming = await db.appointment.findMany({
    where: { barberId, status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] }, startsAt: { gte: new Date() } },
    select: { id: true }, take: 100,
  });
  for (const a of upcoming) await syncAppointment(a.id);
}

/**
 * Horarios ocupados por eventos que NO son de este sistema, para un día.
 * Sin calendario conectado → []. Con calendario pero sin poder consultarlo → error:
 * nunca se asume que está libre.
 */
export async function externalBusyForDay(barberId: string, date: string, tz: string): Promise<Interval[]> {
  const conn = await db.googleConnection.findUnique({ where: { barberId } });
  if (!conn || conn.status === "DISCONNECTED") return [];
  if (!calendarConfigured() || conn.status === "NEEDS_REAUTH") throw new CalendarUnavailableError("Calendario sin autorización vigente.");
  const [y, m, d] = date.split("-").map(Number);
  try {
    return await listExternalBusy(conn.id, conn.calendarId, zonedToUtc(y, m, d, 0, 0, tz), zonedToUtc(y, m, d + 1, 0, 0, tz), tz);
  } catch (e) {
    throw new CalendarUnavailableError(msg(e));
  }
}
