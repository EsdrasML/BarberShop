import { z } from "zod";

/** "50", "50.5" o "50,50" → centavos enteros. */
export function moneyToCents(v: string): number {
  return Math.round(parseFloat(v.replace(",", ".")) * 100);
}

export const moneyField = z
  .string()
  .trim()
  .regex(/^\d{1,7}([.,]\d{1,2})?$/, "Escribe un precio válido, por ejemplo 50 o 50.00.")
  .transform(moneyToCents);

export const imageField = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "La imagen debe ser una URL https.")
  .transform((v) => (v === "" ? null : v));

export const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`).transform((v) => (v === "" ? null : v));

export const int = (min: number, max: number, msg: string) =>
  z.coerce.number({ invalid_type_error: msg }).int(msg).min(min, msg).max(max, msg);

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del servicio.").max(80),
  description: optionalText(500),
  price: moneyField,
  durationMinutes: int(5, 480, "La duración debe estar entre 5 y 480 minutos."),
  imageUrl: imageField,
  sortOrder: int(0, 999, "Orden entre 0 y 999."),
  isActive: z.boolean(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del producto.").max(80),
  description: optionalText(500),
  price: moneyField,
  imageUrl: imageField,
  trackStock: z.boolean(),
  initialStock: int(0, 100000, "Existencias entre 0 y 100000."),
  lowStockAt: int(0, 1000, "Umbral entre 0 y 1000."),
  isActive: z.boolean(),
});

export const stockAdjustSchema = z.object({
  delta: int(-100000, 100000, "Escribe un número entero.").refine((n) => n !== 0, "El ajuste no puede ser 0."),
  reason: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN"]),
  note: optionalText(200),
});

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Escribe una URL que empiece con https://")
  .transform((v) => (v === "" ? null : v));

// Datos operativos: los edita el administrador del negocio.
export const businessSchema = z.object({
  phone: optionalText(30),
  email: z.string().trim().max(254).refine((v) => v === "" || z.string().email().safeParse(v).success, "Correo no válido.").transform((v) => (v === "" ? null : v)),
  address: optionalText(200),
  hours: z.string().max(1000),
  instagram: httpsUrl,
  facebook: httpsUrl,
  tiktok: httpsUrl,
  whatsapp: httpsUrl,
  slotStepMinutes: int(5, 240, "Entre 5 y 240 minutos."),
  cancellationMinutes: int(0, 10080, "Entre 0 y 10080 minutos."),
  pointsPerService: int(0, 1000, "Entre 0 y 1000."),
  pointsForBenefit: int(1, 10000, "Entre 1 y 10000."),
  benefitPercent: int(1, 100, "Entre 1 y 100."),
});

// Marca y apariencia: SOLO el propietario de la plataforma.
export const brandSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre.").max(80),
  tagline: z.string().trim().min(2).max(120),
  heroTitle: z.string().trim().min(2).max(80),
  heroSubtitle: z.string().trim().min(2).max(400),
  about: z.string().trim().max(2000),
  logoUrl: imageField,
  heroImageUrl: imageField,
  gallery1: imageField,
  gallery2: imageField,
  gallery3: imageField,
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  city: optionalText(60),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Usa el formato #RRGGBB, por ejemplo #FFC000.").transform((v) => v.toUpperCase()),
  timezone: z.string().trim().refine((tz) => {
    try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
  }, "Zona horaria no válida (ej. America/Guatemala)."),
});

/** Cada línea: "Día | Horario". */
export function parseHours(text: string): { ok: true; value: { day: string; hours: string }[] } | { ok: false; error: string } {
  const value: { day: string; hours: string }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [day, ...rest] = line.split("|");
    const hours = rest.join("|").trim();
    if (!day.trim() || !hours) return { ok: false, error: `La línea "${line}" debe tener el formato: Día | Horario` };
    value.push({ day: day.trim().slice(0, 40), hours: hours.slice(0, 60) });
  }
  return { ok: true, value };
}
