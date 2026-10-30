import { zonedToUtc } from "@/lib/tz";

export type Interval = { start: Date; end: Date };
export type WorkBlock = { startMinute: number; endMinute: number };
export type Slot = { startsAt: Date; endsAt: Date };

/** Dos intervalos [inicio, fin) se solapan si cada uno empieza antes de que termine el otro. */
export const overlaps = (a: Interval, b: Interval) => a.start < b.end && a.end > b.start;

/** Día de la semana (0 = domingo) de una fecha "YYYY-MM-DD". */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

type Params = {
  date: string; // YYYY-MM-DD en la zona del negocio
  tz: string;
  durationMinutes: number;
  stepMinutes: number;
  blocks: WorkBlock[]; // jornada del barbero ese día
  busy: Interval[]; // citas, ausencias y (fase 7) eventos externos
  now: Date;
  leadMinutes: number; // antelación mínima; negativo = se permite algo ya iniciado
};

/**
 * Horarios de inicio posibles: dentro de la jornada, alineados al intervalo configurado,
 * con la duración COMPLETA libre (no basta con que el minuto de inicio esté libre).
 */
export function computeSlots(p: Params): Slot[] {
  const [y, m, d] = p.date.split("-").map(Number);
  const earliest = new Date(p.now.getTime() + p.leadMinutes * 60_000);
  const out: Slot[] = [];

  for (const b of [...p.blocks].sort((a, c) => a.startMinute - c.startMinute)) {
    for (let s = b.startMinute; s + p.durationMinutes <= b.endMinute; s += p.stepMinutes) {
      const startsAt = zonedToUtc(y, m, d, Math.floor(s / 60), s % 60, p.tz);
      const endsAt = new Date(startsAt.getTime() + p.durationMinutes * 60_000);
      if (startsAt < earliest) continue;
      if (p.busy.some((i) => overlaps({ start: startsAt, end: endsAt }, i))) continue;
      out.push({ startsAt, endsAt });
    }
  }
  return out;
}
