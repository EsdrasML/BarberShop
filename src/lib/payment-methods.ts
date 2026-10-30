export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "OTHER"] as const;
export type PaymentMethodName = (typeof PAYMENT_METHODS)[number];
export const methodLabel: Record<PaymentMethodName, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta (en el local)",
  OTHER: "Otro",
};
