import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254);

export const passwordField = z
  .string()
  .min(8, "Mínimo 8 caracteres.")
  .max(72, "Máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Incluye al menos una letra.")
  .regex(/\d/, "Incluye al menos un número.");

export const phoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .refine((v) => /^\+?\d{8,15}$/.test(v), "Escribe un teléfono válido (8 a 15 dígitos).");

// Nota: el registro público NO acepta rol. El rol CLIENT lo fija el servidor.
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Escribe tu nombre completo.").max(100),
    email,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({
    token: z.string().min(32).max(128),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

/** Primer mensaje de error por campo. */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
