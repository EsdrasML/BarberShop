import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Se sirve en /robots.txt. Solo se ofrece a Google lo público; paneles, cuentas y API quedan fuera.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/cuenta", "/cliente", "/agendar", "/barbero", "/login", "/registro", "/recuperar", "/restablecer", "/verificar"],
    }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
