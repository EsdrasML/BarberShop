/** Solo se redirige a rutas propias; cualquier otro destino se descarta. */
export function safeCallback(raw?: string | null): string {
  if (!raw) return "/cuenta";
  try {
    if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
    const base = new URL(process.env.AUTH_URL ?? "http://localhost:3000");
    const abs = new URL(raw);
    if (abs.origin === base.origin) return abs.pathname + abs.search;
  } catch {
    /* destino inválido */
  }
  return "/cuenta";
}
