"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { emailProvider, sendPasswordResetEmail } from "@/lib/email";
import type { FormState } from "@/lib/form-state";
import { firstErrors, forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation/auth";
import { safeCallback } from "@/lib/callback";
import { ensureCustomerForUser } from "@/lib/customers";
import { issueEmailVerification, sha256 } from "@/lib/verification";

const GENERIC_LOGIN_ERROR = "Correo o contraseña incorrectos.";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Solo se llama tras un fallo de login: ¿la contraseña era correcta pero falta verificar el correo? */
async function isPendingVerification(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !user.isActive || user.emailVerified) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { error: GENERIC_LOGIN_ERROR, values };

  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: safeCallback(str(fd, "callbackUrl")) });
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === "CredentialsSignin") {
        if (await isPendingVerification(parsed.data.email, parsed.data.password)) {
          return {
            error: "Falta verificar tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).",
            needsVerification: true,
            values: { email: parsed.data.email },
          };
        }
        return { error: GENERIC_LOGIN_ERROR, values };
      }
      return { error: "No se pudo iniciar sesión. Inténtalo de nuevo.", values };
    }
    throw e; // la redirección de éxito también es una excepción y debe propagarse
  }
  return { values };
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { fullName: str(fd, "fullName"), email: str(fd, "email"), phone: str(fd, "phone") };
  const parsed = registerSchema.safeParse({ ...values, password: str(fd, "password"), confirmPassword: str(fd, "confirmPassword") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  if (fd.get("terms") !== "on") return { fieldErrors: { terms: "Debes aceptar los términos y la política de privacidad." }, values };

  const { fullName, email, phone, password } = parsed.data;
  let createdId: string;
  try {
    // El rol se fija aquí, en el servidor. La cuenta queda SIN verificar hasta que se use el enlace del correo.
    createdId = (await db.user.create({
      data: {
        name: fullName,
        email,
        phone,
        role: "CLIENT",
        passwordHash: await bcrypt.hash(password, 12),
      },
    })).id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { email: "Ya existe una cuenta con este correo." }, values };
    }
    throw e;
  }

  await db.auditLog.create({ data: { actorId: createdId, action: "user.accept_terms", entity: "User", entityId: createdId } }).catch(() => undefined);
  let sent = false;
  try {
    sent = (await issueEmailVerification(email, fullName)).status === "sent";
  } catch (e) {
    console.error("No se pudo enviar el correo de verificación", e);
  }
  if (!sent) {
    // La cuenta existe, pero el correo no salió: se dice la verdad en vez de afirmar que se envió.
    return {
      message: "Tu cuenta se creó.",
      error: "No pudimos enviar el correo de verificación en este momento. Inténtalo con «Reenviar» en unos minutos o comunícate con la barbería.",
      values: { email },
    };
  }
  return {
    message: `Te enviamos un correo a ${email}. Pulsa el botón del mensaje para verificar tu cuenta y poder iniciar sesión.`,
    values: { email },
  };
}

export async function resendVerificationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").trim().toLowerCase();
  // Sin proveedor de correo no se puede enviar a nadie: se avisa a todos por igual (no revela qué cuentas existen).
  if (!emailProvider()) return { error: "El envío de correos no está disponible en este momento. Comunícate con la barbería." };
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.isActive && !user.emailVerified && user.passwordHash) {
      await issueEmailVerification(user.email, user.name, true);
    }
  } catch (e) {
    console.error("Error al reenviar la verificación", e);
  }
  return { message: "Si la cuenta existe y falta verificarla, te enviamos un nuevo correo. Espera un minuto antes de pedir otro." };
}

export async function googleAction(callbackUrl: string) {
  await signIn("google", { redirectTo: safeCallback(callbackUrl) });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

const RESET_MESSAGE = "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  if (!emailProvider()) return { error: "El envío de correos no está disponible en este momento. Comunícate con la barbería.", values };
  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString("hex");
      await db.$transaction([
        db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        db.passwordResetToken.create({
          data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
        }),
      ]);
      const base = process.env.AUTH_URL ?? "http://localhost:3000";
      await sendPasswordResetEmail(user.email, `${base}/restablecer?token=${token}`);
    }
  } catch (e) {
    console.error("Error en recuperación de contraseña", e);
  }
  // Misma respuesta exista o no el correo, para no revelar qué correos están registrados.
  return { message: RESET_MESSAGE, values };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: str(fd, "token"),
    password: str(fd, "password"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "El enlace no es válido o ya venció. Pide uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.$transaction([
    // Abrir el enlace enviado al correo demuestra que es suyo: también deja verificada la cuenta (invitaciones incluidas).
    db.user.update({ where: { id: record.userId }, data: { passwordHash, ...(record.user.emailVerified ? {} : { emailVerified: new Date() }) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);
  if (!record.user.emailVerified && record.user.role === "CLIENT") await ensureCustomerForUser(record.user);
  return { message: "Contraseña actualizada. Ya puedes iniciar sesión." };
}
