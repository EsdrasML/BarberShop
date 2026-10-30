import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { themeVars } from "@/lib/color";
import { getShop } from "@/lib/shop";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Archivo (variable, con eje de ancho) sustituye a LamboType, que es propietaria.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

// Título y descripción que Google muestra en los resultados; se editan en Marca y apariencia → Google.
export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();
  const title = shop.seoTitle || `${shop.name} · ${shop.tagline}`;
  const description = shop.seoDescription || shop.heroSubtitle;
  const images = shop.heroImageUrl ? [{ url: shop.heroImageUrl, alt: shop.name }] : undefined;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${shop.name}` },
    description,
    applicationName: shop.name,
    openGraph: { type: "website", locale: "es_GT", siteName: shop.name, title, description, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
    ...(shop.logoUrl ? { icons: { icon: shop.logoUrl } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  return (
    <html lang="es-GT" className={archivo.variable} style={themeVars(shop.accentColor) as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
