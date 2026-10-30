import { describe, expect, it } from "vitest";
import { utcToLocalInputs, zonedToUtc } from "./tz";

describe("tz", () => {
  it("Guatemala es UTC-6 todo el año", () => {
    expect(zonedToUtc(2026, 10, 21, 9, 0, "America/Guatemala").toISOString()).toBe("2026-10-21T15:00:00.000Z");
    expect(zonedToUtc(2026, 1, 5, 0, 0, "America/Guatemala").toISOString()).toBe("2026-01-05T06:00:00.000Z");
  });

  it("ida y vuelta", () => {
    const d = zonedToUtc(2026, 12, 31, 23, 30, "America/Guatemala");
    expect(utcToLocalInputs(d, "America/Guatemala")).toEqual({ date: "2026-12-31", time: "23:30" });
  });

  it("el día siguiente desborda correctamente", () => {
    expect(zonedToUtc(2026, 12, 32, 0, 0, "America/Guatemala").toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });
});
