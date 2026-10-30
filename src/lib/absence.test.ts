import { describe, expect, it } from "vitest";
import { buildAbsenceRange } from "./absence";

const tz = "America/Guatemala";
const base = { allDay: true, startDate: "2026-11-02", endDate: "", startTime: "", endTime: "" };

describe("buildAbsenceRange", () => {
  it("un día completo cubre de 00:00 a 00:00 del día siguiente", () => {
    const r = buildAbsenceRange(base, tz);
    expect(r.ok && r.startsAt.toISOString()).toBe("2026-11-02T06:00:00.000Z");
    expect(r.ok && r.endsAt.toISOString()).toBe("2026-11-03T06:00:00.000Z");
  });

  it("varios días incluyen el último", () => {
    const r = buildAbsenceRange({ ...base, endDate: "2026-11-04" }, tz);
    expect(r.ok && r.endsAt.toISOString()).toBe("2026-11-05T06:00:00.000Z");
  });

  it("por horas", () => {
    const r = buildAbsenceRange({ ...base, allDay: false, startTime: "14:00", endTime: "16:30" }, tz);
    expect(r.ok && r.startsAt.toISOString()).toBe("2026-11-02T20:00:00.000Z");
    expect(r.ok && r.endsAt.toISOString()).toBe("2026-11-02T22:30:00.000Z");
  });

  it("rechaza rangos invertidos", () => {
    expect(buildAbsenceRange({ ...base, endDate: "2026-11-01" }, tz).ok).toBe(false);
    expect(buildAbsenceRange({ ...base, allDay: false, startTime: "16:00", endTime: "14:00" }, tz).ok).toBe(false);
  });
});
