import { describe, expect, it } from "vitest";
import { computeSlots, overlaps, weekdayOf } from "./availability";
import { zonedToUtc } from "./tz";

const tz = "America/Guatemala";
const at = (h: number, m = 0) => zonedToUtc(2026, 11, 2, h, m, tz); // lunes 2 nov 2026
const base = {
  date: "2026-11-02", tz, durationMinutes: 50, stepMinutes: 50,
  blocks: [{ startMinute: 9 * 60, endMinute: 13 * 60 }],
  busy: [], now: new Date("2026-11-01T00:00:00Z"), leadMinutes: 30,
};
const labels = (s: { startsAt: Date }[]) => s.map((x) => x.startsAt.toISOString());

describe("disponibilidad", () => {
  it("genera inicios alineados y con la duración completa dentro de la jornada", () => {
    // 9:00, 9:50, 10:40, 11:30  (12:20 + 50 min se saldría de la jornada)
    expect(computeSlots(base)).toHaveLength(4);
    expect(computeSlots(base)[3].startsAt.toISOString()).toBe(at(11, 30).toISOString());
  });

  it("una cita de 10:00 a 10:50 bloquea un inicio a las 10:30", () => {
    const busy = [{ start: at(10), end: at(10, 50) }];
    const slots = computeSlots({ ...base, stepMinutes: 30, busy });
    expect(labels(slots)).not.toContain(at(10, 30).toISOString());
    expect(labels(slots)).not.toContain(at(9, 30).toISOString()); // 9:30–10:20 también choca
    expect(labels(slots)).toContain(at(11).toISOString()); // 11:00 ya es posterior al fin de la otra cita (10:50)
  });

  it("una ausencia bloquea los horarios que toca", () => {
    const busy = [{ start: at(9), end: at(11) }];
    const slots = computeSlots({ ...base, busy });
    expect(labels(slots)).toEqual([at(11, 30).toISOString()]);
  });

  it("respeta la antelación mínima", () => {
    const now = at(9, 40); // faltan 20 min para 10:00
    const slots = computeSlots({ ...base, stepMinutes: 60, now });
    expect(labels(slots)).not.toContain(at(10).toISOString());
    expect(labels(slots)).toContain(at(11).toISOString());
  });

  it("sin jornada ese día no hay horarios", () => {
    expect(computeSlots({ ...base, blocks: [] })).toEqual([]);
  });

  it("calcula el día de la semana y los solapamientos", () => {
    expect(weekdayOf("2026-11-02")).toBe(1);
    expect(overlaps({ start: at(10), end: at(11) }, { start: at(11), end: at(12) })).toBe(false);
    expect(overlaps({ start: at(10), end: at(11) }, { start: at(10, 30), end: at(12) })).toBe(true);
  });
});
