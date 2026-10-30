"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireOwner } from "@/lib/session";
import { firstErrors } from "@/lib/validation/auth";
import { brandSchema, businessSchema, parseHours } from "@/lib/validation/catalog";

const BUSINESS_FIELDS = [
  "phone", "email", "address", "hours", "instagram", "facebook", "tiktok", "whatsapp",
  "slotStepMinutes", "cancellationMinutes", "pointsPerService", "pointsForBenefit", "benefitPercent",
] as const;

const BRAND_FIELDS = [
  "name", "tagline", "heroTitle", "heroSubtitle", "about", "logoUrl", "heroImageUrl",
  "gallery1", "gallery2", "gallery3", "accentColor", "timezone", "seoTitle", "seoDescription", "city",
] as const;

const pick = (fd: FormData, keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));

/** Contacto, horarios, redes y reglas. Solo el propietario de la plataforma: el cliente no los modifica. */
export async function updateBusinessAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireOwner();
  const values = pick(fd, BUSINESS_FIELDS);
  const parsed = businessSchema.safeParse(values);
  const errors = parsed.success ? {} : firstErrors(parsed.error);
  const hours = parseHours(values.hours);
  if (!hours.ok) errors.hours = hours.error;
  if (!parsed.success || !hours.ok) return { fieldErrors: errors, values };

  const d = parsed.data;
  const social = Object.fromEntries(
    Object.entries({ instagram: d.instagram, facebook: d.facebook, tiktok: d.tiktok, whatsapp: d.whatsapp }).filter(([, v]) => v),
  );
  const data = {
    phone: d.phone, email: d.email, address: d.address, openingHours: hours.value, socialLinks: social,
    slotStepMinutes: d.slotStepMinutes, cancellationMinutes: d.cancellationMinutes,
    pointsPerService: d.pointsPerService, pointsForBenefit: d.pointsForBenefit, benefitPercent: d.benefitPercent,
  };

  const before = await db.shopSettings.findUnique({ where: { id: "shop" } });
  await db.shopSettings.upsert({ where: { id: "shop" }, update: data, create: { id: "shop", ...data } });

  const rules = ["slotStepMinutes", "cancellationMinutes", "pointsPerService", "pointsForBenefit", "benefitPercent"] as const;
  const changed = rules.filter((k) => before && before[k] !== data[k]).map((k) => ({ rule: k, from: before![k], to: data[k] }));
  if (changed.length) await audit(admin.id, "settings.rules_change", "ShopSettings", "shop", changed);

  revalidatePath("/", "layout");
  return { message: "Datos del negocio guardados.", values };
}

/** Propietario de la plataforma: identidad visual y textos del sitio. */
export async function updateBrandAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const values = pick(fd, BRAND_FIELDS);
  const parsed = brandSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const d = parsed.data;
  const data = {
    name: d.name, tagline: d.tagline, heroTitle: d.heroTitle, heroSubtitle: d.heroSubtitle, about: d.about,
    logoUrl: d.logoUrl, heroImageUrl: d.heroImageUrl,
    galleryUrls: [d.gallery1, d.gallery2, d.gallery3].filter((u): u is string => Boolean(u)),
    accentColor: d.accentColor, timezone: d.timezone, seoTitle: d.seoTitle, seoDescription: d.seoDescription, city: d.city,
  };
  await db.shopSettings.upsert({ where: { id: "shop" }, update: data, create: { id: "shop", ...data } });
  await audit(owner.id, "brand.update", "ShopSettings", "shop", { name: d.name, accentColor: d.accentColor });

  revalidatePath("/", "layout");
  return { message: "Marca y apariencia guardadas.", values };
}
