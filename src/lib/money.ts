// Todo el dinero se maneja en centavos enteros para evitar errores de decimales.
const formatter = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
});

export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

/** Porcentaje de un importe, redondeado al centavo. */
export function percentOfCents(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/** Aplica un descuento sin permitir totales negativos. */
export function applyDiscount(cents: number, discountCents: number) {
  const discount = Math.min(Math.max(discountCents, 0), cents);
  return { discountCents: discount, totalCents: cents - discount };
}
