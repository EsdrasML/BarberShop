import { z } from "zod";
import type { PaymentMethodName } from "@/lib/payment-methods";
import { moneyToCents } from "./catalog";

const lines = z.array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(99) })).max(30);

export type ParsedSale = {
  products: Array<{ productId: string; quantity: number }>;
  payNow: true;
  applyBenefit: boolean;
  payment: { method: PaymentMethodName; receivedCents: number | null; reference: string | null };
};

/**
 * Campos del formulario de cobro: productos, beneficio y «monto a registrar».
 * El cobro siempre se registra en el momento y el monto debe coincidir con el total (lo comprueba el servidor).
 */
export function parseSaleFields(get: (k: string) => string): { ok: true; value: ParsedSale } | { ok: false; error: string } {
  let raw: unknown = [];
  try { raw = JSON.parse(get("lines") || "[]"); } catch { return { ok: false, error: "No se pudo leer la lista de productos." }; }
  const products = lines.safeParse(raw);
  if (!products.success) return { ok: false, error: "La lista de productos no es válida." };

  const amount = get("amount").trim();
  if (!amount) return { ok: false, error: "Escribe el monto a registrar." };
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(amount)) return { ok: false, error: "El monto a registrar no es válido." };

  return {
    ok: true,
    value: {
      products: products.data,
      payNow: true,
      applyBenefit: get("applyBenefit") === "on",
      payment: { method: "CASH", receivedCents: moneyToCents(amount), reference: null },
    },
  };
}
