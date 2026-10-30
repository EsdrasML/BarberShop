import { describe, expect, it } from "vitest";
import { applyDiscount, percentOfCents } from "./money";

describe("money", () => {
  it("50% de Q100 es Q50", () => {
    const original = 10000;
    const discount = percentOfCents(original, 50);
    expect(discount).toBe(5000);
    expect(applyDiscount(original, discount).totalCents).toBe(5000);
  });

  it("el descuento nunca deja el total en negativo", () => {
    expect(applyDiscount(3000, 9999)).toEqual({ discountCents: 3000, totalCents: 0 });
  });

  it("redondea al centavo", () => {
    expect(percentOfCents(3333, 50)).toBe(1667);
  });
});
