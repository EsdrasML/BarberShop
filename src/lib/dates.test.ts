import { describe, expect, it } from "vitest";
import { addDays, daysInMonth, formatDMY, shiftMonth, weekdayIndex } from "./dates";

describe("fechas", () => {
  it("se muestran como día/mes/año", () => {
    expect(formatDMY("2026-10-23")).toBe("23/10/2026");
    expect(formatDMY("")).toBe("");
  });

  it("suma días cruzando mes y año", () => {
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("calcula días del mes y día de la semana", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(weekdayIndex("2026-10-23")).toBe(5); // viernes
  });

  it("navega entre meses", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
  });
});
