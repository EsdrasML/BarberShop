import crypto from "node:crypto";
import type { Interval } from "@/lib/availability";
import { decrypt, encrypt, encryptionConfigured } from "@/lib/crypto";
import { db } from "@/lib/db";
import { zonedToUtc } from "@/lib/tz";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/calendar/v3";

// Permiso mínimo: crear/editar eventos y leer los existentes para detectar horarios ocupados.
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const SCOPES = ["openid", "email", CALENDAR_SCOPE];

export const calendarConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET && encryptionConfigured());

export const redirectUri = () => `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/google-calendar/callback`;

export class CalendarError extends Error {
  constructor(public kind: "auth" | "transient" | "other", message: string) { super(message); }
}
/** No se pudo consultar la agenda de Google: por seguridad NO se asume que el barbero está libre. */
export class CalendarUnavailableError extends Error {}

export function authUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: "code",
    scope: SCOPES.join(" "), access_type: "offline", prompt: "consent", state,
  });
  return `${AUTH_URL}?${q}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string; id_token?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (body as { error?: string }).error;
    throw new CalendarError(code === "invalid_grant" || res.status === 401 ? "auth" : res.status >= 500 ? "transient" : "other", `Google rechazó la autorización (${code ?? res.status}).`);
  }
  return body as TokenResponse;
}

export const exchangeCode = (code: string) => tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });

export function emailFromIdToken(idToken?: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken!.split(".")[1], "base64url").toString("utf8")) as { email?: string };
    return payload.email ?? null;
  } catch { return null; }
}

async function markStatus(id: string, status: "NEEDS_REAUTH" | "ERROR" | "CONNECTED", lastError: string | null) {
  await db.googleConnection.update({ where: { id }, data: { status, lastError } }).catch(() => undefined);
}

/** Access token vigente: se renueva con el refresh token cuando está por vencer. */
async function accessToken(connectionId: string, force = false): Promise<string> {
  const c = await db.googleConnection.findUnique({ where: { id: connectionId } });
  if (!c || c.status === "DISCONNECTED") throw new CalendarError("auth", "El calendario no está conectado.");
  if (!force && c.accessTokenExpiry && c.accessTokenExpiry.getTime() > Date.now() + 60_000) return decrypt(c.accessTokenEnc);
  if (!c.refreshTokenEnc) {
    await markStatus(c.id, "NEEDS_REAUTH", "Falta el permiso de acceso continuo: vuelve a conectar.");
    throw new CalendarError("auth", "Hay que volver a autorizar el calendario.");
  }
  try {
    const t = await tokenRequest({ refresh_token: decrypt(c.refreshTokenEnc), grant_type: "refresh_token" });
    await db.googleConnection.update({
      where: { id: c.id },
      data: { accessTokenEnc: encrypt(t.access_token), accessTokenExpiry: new Date(Date.now() + t.expires_in * 1000), status: "CONNECTED", lastError: null },
    });
    return t.access_token;
  } catch (e) {
    if (e instanceof CalendarError && e.kind === "auth") await markStatus(c.id, "NEEDS_REAUTH", "Google revocó o venció el permiso: vuelve a conectar.");
    throw e;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Llamada a la API con renovación de token y reintentos ante errores temporales (429/5xx). */
async function gcal(connectionId: string, path: string, init: RequestInit = {}): Promise<Response> {
  let forced = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const token = await accessToken(connectionId, forced);
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    } catch {
      if (attempt === 3) throw new CalendarError("transient", "No hay conexión con Google Calendar.");
      await sleep(300 * attempt);
      continue;
    }
    if (res.status === 401 && !forced) { forced = true; attempt--; continue; }
    if (res.status === 401) { await markStatus(connectionId, "NEEDS_REAUTH", "Google no aceptó el permiso: vuelve a conectar."); throw new CalendarError("auth", "Autorización rechazada."); }
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(400 * attempt); continue; }
    return res;
  }
  throw new CalendarError("transient", "Google Calendar no respondió.");
}

// ───── Eventos propios (citas) ─────
/** Id determinista (hexadecimal, válido para Google): reintentar la misma operación no duplica el evento. */
export const eventIdFor = (appointmentId: string) => crypto.createHash("sha256").update(`barberia:${appointmentId}`).digest("hex").slice(0, 40);

export type EventBody = {
  summary: string; description: string; start: Date; end: Date; timeZone: string; appointmentId: string;
};

const toBody = (e: EventBody) => ({
  summary: e.summary, description: e.description, status: "confirmed",
  start: { dateTime: e.start.toISOString(), timeZone: e.timeZone }, end: { dateTime: e.end.toISOString(), timeZone: e.timeZone },
  extendedProperties: { private: { barberiaAppointmentId: e.appointmentId } },
});

const fail = async (res: Response): Promise<never> => {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  throw new CalendarError(res.status === 401 || res.status === 403 ? "auth" : res.status >= 500 ? "transient" : "other", body?.error?.message ?? `Google respondió ${res.status}.`);
};

export async function upsertEvent(connectionId: string, calendarId: string, eventId: string, e: EventBody) {
  const cal = encodeURIComponent(calendarId);
  const ins = await gcal(connectionId, `/calendars/${cal}/events`, { method: "POST", body: JSON.stringify({ id: eventId, ...toBody(e) }) });
  if (ins.ok) return;
  if (ins.status !== 409) return fail(ins); // 409 = ya existe: se actualiza (evita duplicados al reintentar)
  const upd = await gcal(connectionId, `/calendars/${cal}/events/${eventId}`, { method: "PUT", body: JSON.stringify(toBody(e)) });
  if (!upd.ok) await fail(upd);
}

export async function deleteEvent(connectionId: string, calendarId: string, eventId: string) {
  const res = await gcal(connectionId, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404 && res.status !== 410) await fail(res);
}

// ───── Horarios ocupados por eventos de otras personas/usos ─────
type GEvent = {
  status?: string; transparency?: string;
  start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/** Pura. Ignora eventos cancelados, "disponible" y los creados por este sistema (esos ya están en la base de datos). */
export function externalBusyFromEvents(items: GEvent[], tz: string): Interval[] {
  const out: Interval[] = [];
  for (const ev of items) {
    if (ev.status === "cancelled" || ev.transparency === "transparent") continue;
    if (ev.extendedProperties?.private?.barberiaAppointmentId) continue;
    if (ev.start?.dateTime && ev.end?.dateTime) out.push({ start: new Date(ev.start.dateTime), end: new Date(ev.end.dateTime) });
    else if (ev.start?.date && ev.end?.date) {
      const [sy, sm, sd] = ev.start.date.split("-").map(Number);
      const [ey, em, ed] = ev.end.date.split("-").map(Number);
      out.push({ start: zonedToUtc(sy, sm, sd, 0, 0, tz), end: zonedToUtc(ey, em, ed, 0, 0, tz) }); // día completo
    }
  }
  return out;
}

export async function listExternalBusy(connectionId: string, calendarId: string, from: Date, to: Date, tz: string): Promise<Interval[]> {
  const q = new URLSearchParams({
    timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", maxResults: "250",
    fields: "items(status,transparency,start,end,extendedProperties/private)",
  });
  const res = await gcal(connectionId, `/calendars/${encodeURIComponent(calendarId)}/events?${q}`);
  if (!res.ok) return fail(res);
  const body = (await res.json()) as { items?: GEvent[] };
  return externalBusyFromEvents(body.items ?? [], tz);
}

export async function revokeToken(refreshOrAccessToken: string) {
  await fetch(REVOKE_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: refreshOrAccessToken }) }).catch(() => undefined);
}
