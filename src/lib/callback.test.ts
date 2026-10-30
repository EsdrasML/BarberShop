import { describe, expect, it } from "vitest";
import { safeCallback } from "./callback";

describe("safeCallback", () => {
  it("acepta rutas propias y descarta destinos externos", () => {
    expect(safeCallback("/agendar?servicio=1")).toBe("/agendar?servicio=1");
    expect(safeCallback("http://localhost:3000/agendar")).toBe("/agendar");
    expect(safeCallback("https://malo.example/robo")).toBe("/cuenta");
    expect(safeCallback("//malo.example")).toBe("/cuenta");
    expect(safeCallback(undefined)).toBe("/cuenta");
  });
});
