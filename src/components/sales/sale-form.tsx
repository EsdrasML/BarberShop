"use client";

import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { CheckField, Field, SelectField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { formatMoney } from "@/lib/money";
import { canRedeem, computeTotals } from "@/lib/sale-math";
import { CustomerPicker, type PickerMode } from "./customer-picker";

type Product = { id: string; name: string; priceCents: number; stock: number | null };

type Props = {
  action: (p: FormState, fd: FormData) => Promise<FormState>;
  idempotencyKey: string;
  products: Product[];
  benefit: { threshold: number; percent: number };
  /** Sucursales activas: las ventas se llevan por sucursal (con una sola, se usa sin preguntar). */
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string | null;
  /** Cobro de una cita: servicio y cliente vienen de la cita. */
  fixed?: { serviceName: string; priceCents: number; customerName: string; points: number };
  /** Walk-in: se elige cliente (o visita), barbero y servicio (o solo productos). */
  walkIn?: { services: Array<{ id: string; name: string; priceCents: number; durationMinutes: number }>; barbers: Array<{ id: string; displayName: string }> };
};

export function SaleForm({ action, idempotencyKey, products, benefit, branches, defaultBranchId, fixed, walkIn }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [pick, setPick] = useState("");
  const [applyBenefit, setApplyBenefit] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [typed, setTyped] = useState<string | null>(null); // null = se sigue el total calculado
  const [customer, setCustomer] = useState<{ mode: PickerMode; points: number; hasCustomer: boolean }>({ mode: "existing", points: 0, hasCustomer: false });

  const service = fixed ? { name: fixed.serviceName, priceCents: fixed.priceCents } : walkIn?.services.find((s) => s.id === serviceId) ?? null;
  const points = fixed ? fixed.points : customer.points;
  const hasCustomer = fixed ? true : customer.hasCustomer;
  const eligible = !!service && hasCustomer && canRedeem(points, benefit.threshold);
  const useBenefit = eligible && applyBenefit;

  const catalog = new Map(products.map((p) => [p.id, p]));
  const totals = computeTotals({
    serviceCents: service?.priceCents ?? null,
    lines: lines.map((l) => ({ unitPriceCents: catalog.get(l.productId)?.priceCents ?? 0, quantity: l.quantity })),
    benefitPercent: useBenefit ? benefit.percent : null,
  });
  // El campo siempre es controlado: sigue al total hasta que se escribe algo distinto.
  const amount = typed ?? (totals.totalCents / 100).toFixed(2);
  const amountCents = /^\d{1,7}([.,]\d{1,2})?$/.test(amount.trim()) ? Math.round(parseFloat(amount.replace(",", ".")) * 100) : null;
  const mismatch = amountCents !== null && amountCents !== totals.totalCents;

  const add = () => {
    if (!pick) return;
    setLines((ls) => (ls.some((l) => l.productId === pick) ? ls.map((l) => (l.productId === pick ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l)) : [...ls, { productId: pick, quantity: 1 }]));
    setPick("");
    setTyped(null);
  };
  const setQty = (id: string, q: number) => {
    setLines((ls) => (q <= 0 ? ls.filter((l) => l.productId !== id) : ls.map((l) => (l.productId === id ? { ...l, quantity: Math.min(99, q) } : l))));
    setTyped(null);
  };

  const e = state.fieldErrors ?? {};
  const nothing = !service && lines.length === 0;

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-8">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      {state.error && <FormAlert>{state.error}</FormAlert>}

      {branches.length > 1 && (
        <div className="max-w-xs">
          <SelectField label="Sucursal de la venta" name="branchId" required defaultValue={branches.some((b) => b.id === defaultBranchId) ? defaultBranchId! : ""}>
            <option value="">Elige la sucursal…</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </SelectField>
        </div>
      )}

      {fixed ? (
        <section className="rounded-2xl bg-charcoal p-6">
          <p className="label-micro text-steel">Cliente</p>
          <p className="text-lg">{fixed.customerName} <span className="text-sm text-gold-text">★ {fixed.points} pts</span></p>
          <p className="label-micro mt-4 text-steel">Servicio (precio acordado al reservar)</p>
          <p>{fixed.serviceName} · {formatMoney(fixed.priceCents)}</p>
        </section>
      ) : (
        walkIn && (
          <>
            <CustomerPicker errors={e} onChange={setCustomer} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Servicio" name="serviceId" value={serviceId} onChange={(ev) => { setServiceId(ev.target.value); setApplyBenefit(false); setTyped(null); }}>
                <option value="">Solo productos (sin servicio)</option>
                {walkIn.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatMoney(s.priceCents)}</option>)}
              </SelectField>
              <SelectField label="Barbero que atendió" name="barberId" defaultValue="">
                <option value="">—</option>
                {walkIn.barbers.map((b) => <option key={b.id} value={b.id}>{b.displayName}</option>)}
              </SelectField>
            </div>
          </>
        )
      )}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="feature-heading">Productos</h2>
          <p className="mt-1 text-sm text-steel">¿El cliente quiere llevarse algún producto? Agrégalo aquí y se suma a esta venta y al reporte.</p>
        </div>
        {products.length === 0 ? (
          <p className="text-sm text-steel">No hay productos activos para vender.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <SelectField label="Agregar producto" name="productPick" value={pick} onChange={(ev) => setPick(ev.target.value)}>
                <option value="">Elige un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock !== null && p.stock <= 0}>
                    {p.name} · {formatMoney(p.priceCents)}{p.stock !== null ? ` · ${p.stock} disp.` : ""}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button variant="ghost" size="sm" onClick={add} disabled={!pick}>Agregar</Button>
          </div>
        )}
        {lines.length > 0 && (
          <ul className="flex flex-col gap-2">
            {lines.map((l) => {
              const p = catalog.get(l.productId)!;
              const over = p.stock !== null && l.quantity > p.stock;
              return (
                <li key={l.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-charcoal px-5 py-3">
                  <span>{p.name}{over && <span className="ml-2 text-sm text-danger">Solo hay {p.stock}</span>}</span>
                  <span className="flex items-center gap-3">
                    <button type="button" aria-label={`Menos ${p.name}`} onClick={() => setQty(l.productId, l.quantity - 1)} className="btn size-9 cursor-pointer rounded-full border border-graphite hover:border-white">−</button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <button type="button" aria-label={`Más ${p.name}`} onClick={() => setQty(l.productId, l.quantity + 1)} className="btn size-9 cursor-pointer rounded-full border border-graphite hover:border-white">+</button>
                    <span className="w-24 text-right">{formatMoney(p.priceCents * l.quantity)}</span>
                    <button type="button" onClick={() => setQty(l.productId, 0)} className="cursor-pointer text-sm text-danger">Quitar</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {service && hasCustomer && (
        <CheckField label={`Aplicar beneficio: ${benefit.percent}% de descuento en el servicio`} name="applyBenefit" checked={useBenefit}
          disabled={!eligible} onChange={(ev) => { setApplyBenefit(ev.target.checked); setTyped(null); }}
          hint={eligible ? `El cliente tiene ${points} puntos; se descuentan ${benefit.threshold}.` : `El cliente tiene ${points} de ${benefit.threshold} puntos necesarios.`} />
      )}

      <section className="rounded-2xl bg-charcoal p-6" aria-live="polite">
        <dl className="flex flex-col gap-2 text-sm">
          {service && <div className="flex justify-between"><dt>Servicio · {service.name}</dt><dd>{formatMoney(service.priceCents)}</dd></div>}
          {totals.productsCents > 0 && <div className="flex justify-between"><dt>Productos</dt><dd>{formatMoney(totals.productsCents)}</dd></div>}
          {totals.discountCents > 0 && <div className="flex justify-between text-gold-text"><dt>Descuento por puntos ({benefit.percent}%)</dt><dd>− {formatMoney(totals.discountCents)}</dd></div>}
          <div className="flex justify-between border-t border-graphite pt-3 text-lg"><dt>Total</dt><dd>{formatMoney(totals.totalCents)}</dd></div>
        </dl>
      </section>

      <div className="max-w-xs">
        <Field label="Monto a registrar (Q)" name="amount" inputMode="decimal" required value={amount} onChange={(ev) => setTyped(ev.target.value)}
          error={mismatch ? `Debe ser igual al total: ${formatMoney(totals.totalCents)}.` : undefined}
          hint="Es el total de la venta; confírmalo antes de registrar." />
      </div>

      <Button type="submit" variant="accent" size="lg" disabled={pending || nothing || mismatch || amountCents === null} className="self-start">
        {pending ? "Registrando…" : "Registrar cobro"}
      </Button>
    </form>
  );
}
