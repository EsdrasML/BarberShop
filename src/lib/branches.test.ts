import { describe, expect, it } from "vitest";
import { barberServesBranch, resolveBranchId } from "./branches";

describe("sucursales", () => {
  it("sin sucursales activas no se exige ninguna", () => {
    expect(resolveBranchId(undefined, [])).toEqual({ ok: true, id: null });
  });

  it("con una sola se usa automáticamente", () => {
    expect(resolveBranchId(undefined, [{ id: "a" }])).toEqual({ ok: true, id: "a" });
  });

  it("con varias hay que elegir una válida", () => {
    const bs = [{ id: "a" }, { id: "b" }];
    expect(resolveBranchId("b", bs)).toEqual({ ok: true, id: "b" });
    expect(resolveBranchId(undefined, bs).ok).toBe(false);
    expect(resolveBranchId("zzz", bs).ok).toBe(false);
  });

  it("un barbero sin asignación atiende en todas; con asignación, solo en las suyas", () => {
    expect(barberServesBranch([], "a")).toBe(true);
    expect(barberServesBranch(["a"], "a")).toBe(true);
    expect(barberServesBranch(["a"], "b")).toBe(false);
  });
});
