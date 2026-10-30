import { describe, expect, it } from "vitest";
import { moneyToCents, parseHours, serviceSchema } from "./catalog";

const base = { name: "Corte", description: "", price: "50", durationMinutes: "50", imageUrl: "", sortOrder: "0", isActive: true };

describe("catalog validation", () => {
  it("convierte precios a centavos", () => {
    expect(moneyToCents("50")).toBe(5000);
    expect(moneyToCents("35,5")).toBe(3550);
    expect(moneyToCents("0.07")).toBe(7);
  });

  it("acepta un servicio válido y usa 50 min si se indica", () => {
    const r = serviceSchema.parse(base);
    expect(r.price).toBe(5000);
    expect(r.durationMinutes).toBe(50);
    expect(r.imageUrl).toBeNull();
  });

  it("rechaza precios negativos, duraciones absurdas e imágenes no https", () => {
    expect(serviceSchema.safeParse({ ...base, price: "-5" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, durationMinutes: "0" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, imageUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("interpreta los horarios línea por línea", () => {
    const r = parseHours("Lunes a viernes | 9:00 – 18:00\n\nSábado | 9:00 – 14:00");
    expect(r.ok && r.value).toHaveLength(2);
    expect(parseHours("sin separador").ok).toBe(false);
  });
});
