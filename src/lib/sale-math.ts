import { percentOfCents } from "@/lib/money";

/** Desglose de una venta. El beneficio de puntos se aplica SOLO al servicio, nunca a los productos. */
export function computeTotals(a: {
  serviceCents: number | null;
  lines: Array<{ unitPriceCents: number; quantity: number }>;
  benefitPercent: number | null;
}) {
  const productsCents = a.lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const subtotalCents = (a.serviceCents ?? 0) + productsCents;
  const discountCents =
    a.serviceCents && a.benefitPercent ? Math.min(percentOfCents(a.serviceCents, a.benefitPercent), a.serviceCents) : 0;
  return { productsCents, subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}

export const canRedeem = (balance: number, threshold: number) => balance >= threshold;
