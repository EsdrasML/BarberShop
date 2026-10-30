import { describe, expect, it } from "vitest";
import { canTransition, nextStatuses, startedEnough } from "./appointment-status";

describe("estados de la cita", () => {
  it("permite el flujo normal", () => {
    expect(canTransition("CONFIRMED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
  });

  it("los estados finales no se pueden reabrir", () => {
    for (const s of ["COMPLETED", "CANCELLED", "NO_SHOW"] as const) expect(nextStatuses(s)).toEqual([]);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("no se completa una cita que aún no empieza", () => {
    const start = new Date("2026-11-02T15:00:00Z");
    expect(startedEnough("COMPLETED", start, new Date("2026-11-02T10:00:00Z"))).toBe(false);
    expect(startedEnough("COMPLETED", start, new Date("2026-11-02T14:50:00Z"))).toBe(true);
    expect(startedEnough("CANCELLED", start, new Date("2026-11-01T10:00:00Z"))).toBe(true);
  });
});
