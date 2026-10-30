"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

export function StockForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Cantidad (+ entra, − sale)" name="delta" type="number" step={1} required defaultValue={state.values?.delta} error={e.delta} />
      <SelectField label="Motivo" name="reason" defaultValue={state.values?.reason ?? "PURCHASE"} error={e.reason}>
        <option value="PURCHASE">Compra / reposición</option>
        <option value="ADJUSTMENT">Ajuste de inventario</option>
        <option value="RETURN">Devolución</option>
      </SelectField>
      <Field label="Nota (opcional)" name="note" defaultValue={state.values?.note} error={e.note} />
      <Button type="submit" variant="accent" disabled={pending} className="self-start">{pending ? "Guardando…" : "Registrar movimiento"}</Button>
    </form>
  );
}
