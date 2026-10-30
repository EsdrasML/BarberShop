"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { sendTestEmail } from "@/lib/email";
import type { FormState } from "@/lib/form-state";
import { requireOwner } from "@/lib/session";

export async function sendTestEmailAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const to = z.string().trim().toLowerCase().email("Escribe un correo válido.").safeParse(String(fd.get("to") ?? ""));
  if (!to.success) return { fieldErrors: { to: to.error.issues[0].message } };

  const r = await sendTestEmail(to.data);
  await audit(owner.id, "email.test", "Email", undefined, { to: to.data, ok: r.ok });
  if (r.ok) return { message: `Correo enviado a ${to.data}. Revisa la bandeja de entrada y la carpeta de spam.` };
  return {
    error: r.reason === "not_configured"
      ? "No hay un proveedor de correo configurado. Completa SMTP_* (Gmail) o RESEND_API_KEY y EMAIL_FROM en el .env y reinicia."
      : `El proveedor rechazó el correo: ${r.detail ?? "error desconocido"}`,
  };
}
