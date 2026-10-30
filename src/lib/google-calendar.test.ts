import { describe, expect, it } from "vitest";
import { eventIdFor, externalBusyFromEvents } from "./google-calendar";

const tz = "America/Guatemala";

describe("google-calendar", () => {
  it("el id del evento es estable y válido para Google (hex minúsculas)", () => {
    expect(eventIdFor("abc")).toBe(eventIdFor("abc"));
    expect(eventIdFor("abc")).not.toBe(eventIdFor("abd"));
    expect(eventIdFor("abc")).toMatch(/^[0-9a-f]{40}$/);
  });

  it("ocupan: eventos con hora y de día completo; no ocupan: cancelados, 'disponible' y los de este sistema", () => {
    const busy = externalBusyFromEvents(
      [
        { start: { dateTime: "2026-11-02T15:00:00Z" }, end: { dateTime: "2026-11-02T16:00:00Z" } },
        { start: { date: "2026-11-03" }, end: { date: "2026-11-04" } },
        { status: "cancelled", start: { dateTime: "2026-11-02T10:00:00Z" }, end: { dateTime: "2026-11-02T11:00:00Z" } },
        { transparency: "transparent", start: { dateTime: "2026-11-02T12:00:00Z" }, end: { dateTime: "2026-11-02T13:00:00Z" } },
        { extendedProperties: { private: { barberiaAppointmentId: "x" } }, start: { dateTime: "2026-11-02T17:00:00Z" }, end: { dateTime: "2026-11-02T18:00:00Z" } },
      ],
      tz,
    );
    expect(busy).toHaveLength(2);
    expect(busy[1].start.toISOString()).toBe("2026-11-03T06:00:00.000Z"); // día completo en hora de Guatemala
    expect(busy[1].end.toISOString()).toBe("2026-11-04T06:00:00.000Z");
  });
});
