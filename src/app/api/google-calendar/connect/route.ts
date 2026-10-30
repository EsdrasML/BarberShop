import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { signPayload } from "@/lib/crypto";
import { authUrl, calendarConfigured } from "@/lib/google-calendar";
import { assertBarberAccess } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Inicia la conexión del calendario de un barbero: /api/google-calendar/connect?barberId=...
// Quien la inicia debe ser administrador con acceso a ese barbero y entrar con la cuenta de Google del barbero.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/login", req.url));

  const barberId = new URL(req.url).searchParams.get("barberId") ?? "";
  if (!barberId) return NextResponse.redirect(new URL("/admin/barberos", req.url));
  await assertBarberAccess(user, barberId);

  if (!calendarConfigured()) return NextResponse.redirect(new URL(`/admin/barberos/${barberId}?gcal=not-configured`, req.url));

  // El estado va firmado y también en una cookie: el callback solo se acepta si ambos coinciden.
  const state = signPayload({ b: barberId, u: user.id, n: crypto.randomBytes(12).toString("hex"), t: Date.now() }, process.env.AUTH_SECRET!);
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("gcal_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/google-calendar", maxAge: 600 });
  return res;
}
