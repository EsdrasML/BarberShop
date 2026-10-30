import { z } from "zod";
import { passwordField, phoneField } from "./auth";

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Escribe tu nombre completo.").max(100),
  phone: phoneField,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(200),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });
