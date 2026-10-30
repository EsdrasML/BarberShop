/** Dirección pública del sitio (sin barra final). Sale de AUTH_URL, que en producción es el dominio real. */
export function siteUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
