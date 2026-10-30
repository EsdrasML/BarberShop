// Deriva los tonos del tema a partir del color de acento elegido por el propietario.
type RGB = [number, number, number];

export function parseHex(hex: string): RGB | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const mixWithWhite = (c: RGB, t: number): RGB => [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];

export function themeVars(accent: string): Record<string, string> {
  const rgb = parseHex(accent) ?? [255, 192, 0];
  const lum = luminance(rgb);
  const blackContrast = (lum + 0.05) / 0.05;
  const whiteContrast = 1.05 / (lum + 0.05);
  return {
    "--color-gold": toHex(rgb),
    "--color-gold-dark": toHex([rgb[0] * 0.57, rgb[1] * 0.57, rgb[2] * 0.57]),
    // Texto de acento sobre fondo negro: se aclara si el color es muy oscuro para que se lea.
    "--color-gold-text": toHex(mixWithWhite(rgb, lum < 0.25 ? 0.55 : 0.2)),
    // Color del texto sobre botones de acento: el de mayor contraste.
    "--color-on-accent": blackContrast >= whiteContrast ? "#000000" : "#ffffff",
  };
}
