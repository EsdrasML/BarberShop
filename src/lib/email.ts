// Envío de correo: SMTP (Gmail, etc.) o Resend. Ver docs/CORREO.md.
import nodemailer from "nodemailer";
import { db } from "@/lib/db";

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

async function shopName() {
  const s = await db.shopSettings.findUnique({ where: { id: "shop" }, select: { name: true } });
  return s?.name ?? "Barber Shop";
}

type Mail = { to: string; subject: string; text: string; html: string; devLink?: string };
export type SendResult = { ok: true } | { ok: false; reason: "not_configured" | "failed"; detail?: string };

/** Proveedor de correo configurado: SMTP (por ejemplo Gmail) o Resend. */
export function emailProvider(): "smtp" | "resend" | null {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return null;
}

/**
 * Envía un correo y DICE si salió o no. Antes se ignoraban los errores y la pantalla afirmaba "enviado"
 * aunque no llegara nada; ahora el resultado real se devuelve a quien lo pidió.
 */
export async function sendEmail(mail: Mail): Promise<SendResult> {
  const provider = emailProvider();
  const from = process.env.EMAIL_FROM!;
  const devPrint = () => {
    if (process.env.NODE_ENV !== "production" && mail.devLink) console.log(`\n[DEV] ${mail.subject} → ${mail.to}\n${mail.devLink}\n`);
  };

  if (!provider) {
    console.error("Correo sin configurar (faltan SMTP_* o RESEND_API_KEY y EMAIL_FROM): no se envió", mail.subject);
    devPrint();
    return { ok: false, reason: "not_configured" };
  }

  try {
    if (provider === "smtp") {
      const port = Number(process.env.SMTP_PORT ?? 465);
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
      return { ok: true };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      const detail = body?.message ?? `Resend respondió ${res.status}`;
      console.error("Resend rechazó el correo:", res.status, detail);
      devPrint();
      return { ok: false, reason: "failed", detail };
    }
    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Error desconocido";
    console.error("No se pudo enviar el correo:", detail);
    devPrint();
    return { ok: false, reason: "failed", detail };
  }
}

/** Correo de prueba para comprobar la configuración desde el panel del propietario. */
export async function sendTestEmail(to: string): Promise<SendResult> {
  const shop = await shopName();
  return sendEmail({
    to,
    subject: `Prueba de correo · ${shop}`,
    text: `Este es un correo de prueba de ${shop}. Si lo recibes, el envío de correos funciona.`,
    html: layout(shop, "El correo funciona", "Este es un correo de prueba. Si lo estás leyendo, el envío de correos de tu sitio está bien configurado.", "Abrir el sitio", process.env.AUTH_URL ?? "http://localhost:3000", "No tienes que hacer nada más."),
  });
}

function layout(shop: string, heading: string, intro: string, button: string, link: string, outro: string) {
  return `<!doctype html><html><body style="margin:0;background:#000;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#202020;border-radius:20px;padding:36px;color:#fff;">
<tr><td style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#969696;">${esc(shop)}</td></tr>
<tr><td style="font-size:26px;line-height:1.2;padding:16px 0 12px;">${esc(heading)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;color:#f5f5f5;padding-bottom:28px;">${intro}</td></tr>
<tr><td><a href="${link}" style="display:inline-block;background:#FFC000;color:#000;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px;">${esc(button)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#969696;padding-top:28px;">${outro}<br><br>Si el botón no funciona, copia este enlace:<br><span style="word-break:break-all;">${link}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendVerificationEmail(to: string, name: string, link: string): Promise<SendResult> {
  const shop = await shopName();
  const first = esc(name.split(" ")[0] || "");
  return sendEmail({
    to,
    subject: `Verifica tu cuenta · ${shop}`,
    text: `Hola ${name}, verifica tu correo para activar tu cuenta (el enlace vence en 24 horas):\n${link}\n\nSi no creaste esta cuenta, ignora este mensaje.`,
    html: layout(shop, "Verifica tu correo", `Hola ${first}, confirma que este correo es tuyo para activar tu cuenta. El enlace vence en 24 horas.`, "Verificar mi cuenta", link, "Si no creaste esta cuenta, ignora este mensaje."),
    devLink: link,
  });
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<SendResult> {
  const shop = await shopName();
  return sendEmail({
    to,
    subject: `Restablece tu contraseña · ${shop}`,
    text: `Usa este enlace para elegir una nueva contraseña (vence en 1 hora):\n${link}\n\nSi no lo pediste, ignora este mensaje.`,
    html: layout(shop, "Restablece tu contraseña", "Pulsa el botón para elegir una nueva contraseña. El enlace vence en 1 hora y solo se puede usar una vez.", "Elegir nueva contraseña", link, "Si no lo pediste, ignora este mensaje."),
    devLink: link,
  });
}

export async function sendInvitationEmail(to: string, name: string, link: string, role: "barbero" | "administrador" = "barbero"): Promise<SendResult> {
  const shop = await shopName();
  return sendEmail({
    to,
    subject: `Tu acceso a ${shop}`,
    text: `Hola ${name}, ${role === "barbero" ? "el administrador de " : ""}${shop} creó tu acceso como ${role}. Crea tu contraseña aquí (vence en 72 horas):\n${link}`,
    html: layout(shop, "Crea tu contraseña", `Hola ${esc(name.split(" ")[0] || "")}, ${role === "barbero" ? "el administrador de " : ""}${esc(shop)} creó tu acceso como ${role}. Crea tu contraseña para entrar. El enlace vence en 72 horas.`, "Crear mi contraseña", link, "Si no esperabas esta invitación, ignora este mensaje."),
    devLink: link,
  });
}
