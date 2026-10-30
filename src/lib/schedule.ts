export const WEEK = [
  { weekday: 1, label: "Lunes" }, { weekday: 2, label: "Martes" }, { weekday: 3, label: "Miércoles" },
  { weekday: 4, label: "Jueves" }, { weekday: 5, label: "Viernes" }, { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
] as const;

export type Block = { weekday: number; startMinute: number; endMinute: number };

export function timeToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

export const minutesToTime = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Cada día admite dos bloques (ej. mañana y tarde). Claves: `${weekday}_a_start`, `_a_end`, `_b_start`, `_b_end`. */
export function parseWeek(get: (key: string) => string):
  | { ok: true; blocks: Block[] }
  | { ok: false; errors: Record<string, string> } {
  const blocks: Block[] = [];
  const errors: Record<string, string> = {};

  for (const { weekday } of WEEK) {
    const day: Block[] = [];
    for (const slot of ["a", "b"] as const) {
      const s = get(`${weekday}_${slot}_start`).trim();
      const e = get(`${weekday}_${slot}_end`).trim();
      if (!s && !e) continue;
      const sm = timeToMinutes(s), em = timeToMinutes(e);
      if (sm === null || em === null) { errors[`day${weekday}`] = "Completa la hora de inicio y de fin."; continue; }
      if (em <= sm) { errors[`day${weekday}`] = "La hora de fin debe ser posterior a la de inicio."; continue; }
      day.push({ weekday, startMinute: sm, endMinute: em });
    }
    if (day.length === 2) {
      const [x, y] = [...day].sort((p, q) => p.startMinute - q.startMinute);
      if (y.startMinute < x.endMinute) errors[`day${weekday}`] = "Los dos bloques del día no pueden cruzarse.";
    }
    blocks.push(...day);
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, blocks };
}
