"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button, buttonClasses } from "@/components/ui/button";
import { CheckField, Field } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Initial = { name: string; address: string; phone: string; sortOrder: string; isActive: boolean };

export function BranchForm({ action, initial }: { action: (p: FormState, fd: FormData) => Promise<FormState>; initial: Initial }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre" name="name" required defaultValue={v.name} error={e.name} />
      <Field label="Dirección" name="address" defaultValue={v.address} error={e.address} hint="Se muestra en el pie de la página y al reservar." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teléfono" name="phone" type="tel" defaultValue={v.phone} error={e.phone} />
        <Field label="Orden" name="sortOrder" type="number" min={0} defaultValue={v.sortOrder} error={e.sortOrder} />
      </div>
      <CheckField label="Sucursal activa" name="isActive" defaultChecked={initial.isActive}
        hint="Desactivarla no borra sus ventas ni su historial; deja de ofrecerse para citas y cobros." />
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <Link href="/admin/sucursales" className={buttonClasses({ variant: "ghost" })}>Volver</Link>
      </div>
    </form>
  );
}
