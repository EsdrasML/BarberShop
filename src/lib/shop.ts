import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";

const hoursSchema = z.array(z.object({ day: z.string(), hours: z.string() }));
const socialSchema = z.record(z.string(), z.string());
const gallerySchema = z.array(z.string());

const defaults = {
  name: "Barber Shop",
  tagline: "Un corte, una experiencia",
  heroTitle: "El mejor estilo",
  heroSubtitle:
    "Tienda especializada en cortes de barba y cabello. Todo sobre corte, barbería y asesoría de imagen para el hombre.",
  about: "",
  logoUrl: null as string | null,
  heroImageUrl: null as string | null,
  seoTitle: null as string | null,
  seoDescription: null as string | null,
  city: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  address: null as string | null,
  timezone: "America/Guatemala",
  currency: "GTQ",
  slotStepMinutes: 50,
  cancellationMinutes: 120,
  accentColor: "#FFC000",
  pointsPerService: 25,
  pointsForBenefit: 100,
  benefitPercent: 50,
};

/** Configuración del negocio: única fuente para nombre, textos, contacto y reglas de puntos. */
export const getShop = cache(async () => {
  const row = await db.shopSettings.findUnique({ where: { id: "shop" } });
  const base = row ?? defaults;
  return {
    ...base,
    galleryUrls: gallerySchema.catch([]).parse(row?.galleryUrls ?? []),
    openingHours: hoursSchema.catch([]).parse(row?.openingHours ?? []),
    socialLinks: socialSchema.catch({}).parse(row?.socialLinks ?? {}),
  };
});

export function getPublicServices() {
  return db.service.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function getPublicProducts() {
  return db.product.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}
