import type { MetadataRoute } from "next";
import { getShop } from "@/lib/shop";
import { siteUrl } from "@/lib/site";

// Se sirve en /sitemap.xml: solo las páginas públicas que Google debe conocer.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const shop = (await getShop()) as { updatedAt?: Date };
  const updated = shop.updatedAt ?? new Date();
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacidad`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terminos`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
