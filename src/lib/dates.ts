// Fechas como texto "YYYY-MM-DD" (sin zona horaria): se muestran en formato guatemalteco día/mes/año.
export const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const WEEKDAYS_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]; // 0 = domingo

const pad = (n: number) => String(n).padStart(2, "0");
export const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function parseDate(s: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

export function addDays(s: string, n: number): string {
  const [y, m, d] = parseDate(s)!;
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function weekdayIndex(s: string): number {
  const [y, m, d] = parseDate(s)!;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "2026-10-23" → "23/10/2026" */
export function formatDMY(s: string): string {
  const p = parseDate(s);
  return p ? `${pad(p[2])}/${pad(p[1])}/${p[0]}` : "";
}

/** Primer día (YYYY-MM-01) del mes desplazado `n` meses. */
export function shiftMonth(y: number, m: number, n: number): { y: number; m: number } {
  const t = y * 12 + (m - 1) + n;
  return { y: Math.floor(t / 12), m: (t % 12) + 1 };
}
