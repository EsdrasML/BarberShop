"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

export function VoidForm({ action, paid }: { action: (p: FormState, fd: FormData) => Promise<FormState>; paid: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("¿Anular esta venta? No se borra: queda registrada como anulada.")) e.preventDefault(); }} className="flex max-w-md flex-col gap-4">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <p className="text-sm text-steel">
        {paid ? "El pago pasa a anulado, el inventario regresa y se revierten los puntos ganados y el beneficio usado." : "La venta pendiente se anula y el inventario regresa."}
      </p>
      <Field label="Motivo de la anulación" name="reason" required maxLength={200} error={state.fieldErrors?.reason} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="self-start text-danger">{pending ? "Anulando…" : "Anular venta"}</Button>
    </form>
  );
}
