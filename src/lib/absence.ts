import { zonedToUtc } from "@/lib/tz";

type Input = { allDay: boolean; startDate: string; endDate: string; startTime: string; endTime: string };
type Result = { ok: true; startsAt: Date; endsAt: Date } | { ok: false; field: string; error: string };

const parts = (d: string) => d.split("-").map(Number) as [number, number, number];

/** Convierte lo que se escribe en el formulario (hora local del negocio) al intervalo UTC de la ausencia. */
export function buildAbsenceRange(i: Input, tz: string): Result {
  const [y, m, d] = parts(i.startDate);
  if (i.allDay) {
    const endDate = i.endDate || i.startDate;
    if (endDate < i.startDate) return { ok: false, field: "endDate", error: "La fecha final no puede ser anterior a la inicial." };
    const [ey, em, ed] = parts(endDate);
    // Día completo: de las 00:00 del primer día a las 00:00 del día siguiente al último (fin exclusivo).
    return { ok: true, startsAt: zonedToUtc(y, m, d, 0, 0, tz), endsAt: zonedToUtc(ey, em, ed + 1, 0, 0, tz) };
  }
  if (!i.startTime || !i.endTime) return { ok: false, field: "startTime", error: "Indica la hora de inicio y de fin." };
  if (i.endTime <= i.startTime) return { ok: false, field: "endTime", error: "La hora de fin debe ser posterior a la de inicio." };
  const [sh, sm] = i.startTime.split(":").map(Number);
  const [eh, em] = i.endTime.split(":").map(Number);
  return { ok: true, startsAt: zonedToUtc(y, m, d, sh, sm, tz), endsAt: zonedToUtc(y, m, d, eh, em, tz) };
}
