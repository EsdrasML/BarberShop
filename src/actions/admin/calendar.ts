"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { syncAppointment } from "@/lib/calendar-sync";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { revokeToken } from "@/lib/google-calendar";
import { assertAppointmentAccess, assertBarberAccess } from "@/lib/scope";
import { requireRole } from "@/lib/session";

export async function disconnectCalendarAction(barberId: string) {
  const admin = await requireRole("ADMIN");
  await assertBarberAccess(admin, barberId);
  const c = await db.googleConnection.findUnique({ where: { barberId } });
  if (c) {
    // Se revoca el permiso en Google y se borran los tokens. Los eventos ya creados siguen en su calendario.
    try { await revokeToken(decrypt(c.refreshTokenEnc ?? c.accessTokenEnc)); } catch { /* si no se puede revocar, igual se borran */ }
    await db.googleConnection.delete({ where: { barberId } });
    await audit(admin.id, "gcal.disconnect", "Barber", barberId);
  }
  revalidatePath(`/admin/barberos/${barberId}`);
  redirect(`/admin/barberos/${barberId}?gcal=disconnected`);
}

export async function retrySyncAction(appointmentId: string) {
  const admin = await requireRole("ADMIN");
  await assertAppointmentAccess(admin, appointmentId);
  const r = await syncAppointment(appointmentId);
  revalidatePath(`/admin/citas/${appointmentId}`);
  redirect(`/admin/citas/${appointmentId}?${r.state === "failed" ? `error=${encodeURIComponent(r.error ?? "No se pudo sincronizar.")}` : "ok=sync"}`);
}
