"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { CheckField, Field } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { formatMoney } from "@/lib/money";
import { canRedeem, computeTotals } from "@/lib/sale-math";

/** Registrar el pago de una venta que quedó pendiente (ya no se crean ventas pendientes nuevas). */
export function PayForm({ action, idempotencyKey, serviceCents, productsCents, points, benefit, hasCustomer }: {
  action: (p: FormState, fd: FormData) => Promise<FormState>;
  idempotencyKey: string; serviceCents: number | null; productsCents: number; points: number; hasCustomer: boolean;
  benefit: { threshold: number; percent: number };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [apply, setApply] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);

  const eligible = serviceCents !== null && hasCustomer && canRedeem(points, benefit.threshold);
  const t = computeTotals({ serviceCents, lines: productsCents ? [{ unitPriceCents: productsCents, quantity: 1 }] : [], benefitPercent: eligible && apply ? benefit.percent : null });
  const amount = typed ?? (t.totalCents / 100).toFixed(2);
  const cents = /^\d{1,7}([.,]\d{1,2})?$/.test(amount.trim()) ? Math.round(parseFloat(amount.replace(",", ".")) * 100) : null;
  const mismatch = cents !== null && cents !== t.totalCents;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {serviceCents !== null && hasCustomer && (
        <CheckField label={`Aplicar beneficio: ${benefit.percent}% de descuento en el servicio`} name="applyBenefit" checked={eligible && apply}
          disabled={!eligible} onChange={(e) => { setApply(e.target.checked); setTyped(null); }}
          hint={eligible ? `El cliente tiene ${points} puntos; se descuentan ${benefit.threshold}.` : `El cliente tiene ${points} de ${benefit.threshold} puntos necesarios.`} />
      )}
      <p className="text-lg">Total: <span className="text-gold-text">{formatMoney(t.totalCents)}</span></p>
      <Field label="Monto a registrar (Q)" name="amount" inputMode="decimal" required value={amount} onChange={(e) => setTyped(e.target.value)}
        error={mismatch ? `Debe ser igual al total: ${formatMoney(t.totalCents)}.` : undefined} />
      <Button type="submit" variant="accent" disabled={pending || mismatch || cents === null} className="self-start">{pending ? "Registrando…" : "Registrar pago"}</Button>
    </form>
  );
}
