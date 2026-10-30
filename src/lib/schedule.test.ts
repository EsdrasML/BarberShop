import { describe, expect, it } from "vitest";
import { parseWeek, timeToMinutes } from "./schedule";

const form = (o: Record<string, string>) => (k: string) => o[k] ?? "";

describe("schedule", () => {
  it("convierte horas", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("24:00")).toBeNull();
  });

  it("acepta mañana y tarde", () => {
    const r = parseWeek(form({ "1_a_start": "09:00", "1_a_end": "13:00", "1_b_start": "14:00", "1_b_end": "18:00" }));
    expect(r.ok && r.blocks).toHaveLength(2);
  });

  it("rechaza fin anterior al inicio, bloques incompletos y cruzados", () => {
    expect(parseWeek(form({ "2_a_start": "10:00", "2_a_end": "09:00" })).ok).toBe(false);
    expect(parseWeek(form({ "3_a_start": "10:00" })).ok).toBe(false);
    expect(parseWeek(form({ "4_a_start": "09:00", "4_a_end": "13:00", "4_b_start": "12:00", "4_b_end": "15:00" })).ok).toBe(false);
  });
});
