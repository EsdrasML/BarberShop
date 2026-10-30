import { after, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { resyncBarber } from "@/lib/calendar-sync";
import { encrypt, verifyPayload } from "@/lib/crypto";
import { db } from "@/lib/db";
import { CALENDAR_SCOPE, calendarConfigured, emailFromIdToken, exchangeCode } from "@/lib/google-calendar";
import { assertBarberAccess } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/login", req.url));

  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith("gcal_state="))?.slice("gcal_state=".length);
  const state = url.searchParams.get("state");
  const payload = state && cookie && state === cookie && calendarConfigured()
    ? verifyPayload<{ b: string; u: string; t: number }>(state, process.env.AUTH_SECRET!) : null;

  const done = (barberId: string | null, flag: string) => {
    const res = NextResponse.redirect(new URL(barberId ? `/admin/barberos/${barberId}?gcal=${flag}` : "/admin/barberos", req.url));
    res.cookies.set("gcal_state", "", { path: "/api/google-calendar", maxAge: 0 });
    return res;
  };

  // El estado debe ser válido, reciente y de este mismo administrador.
  if (!payload || payload.u !== user.id || Date.now() - payload.t > 10 * 60_000) return done(null, "invalid");
  const barberId = payload.b;
  await assertBarberAccess(user, barberId);

  if (url.searchParams.get("error")) return done(barberId, "denied"); // el usuario canceló en Google
  const code = url.searchParams.get("code");
  if (!code) return done(barberId, "invalid");

  try {
    const t = await exchangeCode(code);
    if (!t.scope?.split(" ").includes(CALENDAR_SCOPE)) return done(barberId, "scope"); // no marcó el permiso del calendario

    const existing = await db.googleConnection.findUnique({ where: { barberId } });
    const refresh = t.refresh_token ?? (existing?.refreshTokenEnc ? undefined : null);
    if (refresh === null) return done(barberId, "no-refresh"); // sin permiso de acceso continuo no se puede mantener la conexión

    const data = {
      googleEmail: emailFromIdToken(t.id_token) ?? existing?.googleEmail ?? "cuenta de Google",
      accessTokenEnc: encrypt(t.access_token),
      accessTokenExpiry: new Date(Date.now() + t.expires_in * 1000),
      ...(refresh ? { refreshTokenEnc: encrypt(refresh) } : {}),
      scopes: t.scope, status: "CONNECTED" as const, lastError: null, calendarId: "primary",
    };
    await db.googleConnection.upsert({ where: { barberId }, update: data, create: { barberId, ...data, refreshTokenEnc: refresh ? encrypt(refresh) : null } });
    await audit(user.id, "gcal.connect", "Barber", barberId, { email: data.googleEmail });
    after(() => resyncBarber(barberId)); // sube a su calendario las citas futuras que ya existían
    return done(barberId, "connected");
  } catch (e) {
    console.error("Conexión con Google Calendar falló:", e instanceof Error ? e.message : e);
    return done(barberId, "failed");
  }
}
