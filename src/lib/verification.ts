import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

const TTL_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

/**
 * Genera un token de verificación (se guarda solo su hash) y envía el correo.
 * Con throttle=true no reenvía si se emitió uno hace menos de 1 minuto
 * (la fecha de emisión se deduce de expires − 24 h).
 */
export type IssueResult = { status: "sent" } | { status: "throttled" } | { status: "failed"; reason: string };

export async function issueEmailVerification(email: string, name: string, throttle = false): Promise<IssueResult> {
  if (throttle) {
    const recent = await db.verificationToken.findFirst({
      where: { identifier: email, expires: { gt: new Date(Date.now() + TTL_MS - COOLDOWN_MS) } },
    });
    if (recent) return { status: "throttled" };
  }
  const token = crypto.randomBytes(32).toString("hex");
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier: email } }),
    db.verificationToken.create({ data: { identifier: email, token: sha256(token), expires: new Date(Date.now() + TTL_MS) } }),
  ]);
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const r = await sendVerificationEmail(email, name, `${base}/verificar?token=${token}`);
  return r.ok ? { status: "sent" } : { status: "failed", reason: r.detail ?? r.reason };
}

/** Token de un solo uso para crear o restablecer contraseña (recuperación e invitaciones). */
export async function issuePasswordToken(userId: string, ttlMs: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) } }),
  ]);
  return token;
}
