import { describe, expect, it } from "vitest";
import { canRedeem, computeTotals } from "./sale-math";

describe("sale-math", () => {
  it("ejemplo del brief: servicio Q100 con 50% → Q50", () => {
    const t = computeTotals({ serviceCents: 10000, lines: [], benefitPercent: 50 });
    expect(t).toMatchObject({ subtotalCents: 10000, discountCents: 5000, totalCents: 5000 });
  });

  it("el descuento no toca los productos", () => {
    const t = computeTotals({ serviceCents: 10000, lines: [{ unitPriceCents: 4000, quantity: 2 }], benefitPercent: 50 });
    expect(t.subtotalCents).toBe(18000);
    expect(t.discountCents).toBe(5000);
    expect(t.totalCents).toBe(13000);
  });

  it("sin beneficio o sin servicio no hay descuento y el total nunca es negativo", () => {
    expect(computeTotals({ serviceCents: 5000, lines: [], benefitPercent: null }).discountCents).toBe(0);
    expect(computeTotals({ serviceCents: null, lines: [{ unitPriceCents: 3000, quantity: 1 }], benefitPercent: 50 }).discountCents).toBe(0);
    expect(computeTotals({ serviceCents: 5000, lines: [], benefitPercent: 100 }).totalCents).toBe(0);
  });

  it("el beneficio exige los puntos del umbral", () => {
    expect(canRedeem(100, 100)).toBe(true);
    expect(canRedeem(75, 100)).toBe(false);
  });
});
