import { z } from "zod";

export const adminSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre completo.").max(100),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254),
  branchId: z.string().max(40),
});
