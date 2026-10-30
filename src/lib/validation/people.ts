import { z } from "zod";
import { phoneField } from "./auth";
import { imageField, optionalText } from "./catalog";

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Correo no válido.")
  .transform((v) => (v === "" ? null : v));

export const customerSchema = z.object({
  fullName: z.string().trim().min(3, "Escribe el nombre completo.").max(100),
  phone: phoneField,
  email: optionalEmail,
});

export const barberSchema = z.object({
  displayName: z.string().trim().min(2, "Escribe el nombre.").max(60),
  bio: optionalText(500),
  phone: optionalText(30),
  email: optionalEmail,
  photoUrl: imageField,
  isActive: z.boolean(),
  canRegisterPayments: z.boolean(),
  canViewRevenue: z.boolean(),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254),
});

export const absenceSchema = z.object({
  type: z.enum(["VACATION", "PERMISSION", "SICK", "OTHER"]),
  allDay: z.boolean(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
  reason: optionalText(200),
});

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la sucursal.").max(60),
  address: optionalText(200),
  phone: optionalText(30),
  sortOrder: z.coerce.number().int().min(0).max(99),
  isActive: z.boolean(),
});
