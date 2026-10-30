"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button, buttonClasses } from "@/components/ui/button";
import { CheckField, Field, TextAreaField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { ImageField } from "./image-field";

type Initial = { name: string; description: string; price: string; imageUrl: string; trackStock: boolean; initialStock: string; lowStockAt: string; isActive: boolean };
export const emptyProduct: Initial = { name: "", description: "", price: "", imageUrl: "", trackStock: false, initialStock: "0", lowStockAt: "3", isActive: true };

export function ProductForm({ action, initial, isNew }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; initial: Initial; isNew: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre" name="name" required defaultValue={v.name} error={e.name} />
      <TextAreaField label="Descripción breve" name="description" defaultValue={v.description} error={e.description} />
      <Field label="Precio (Q)" name="price" inputMode="decimal" required defaultValue={v.price} error={e.price} />
      <ImageField name="imageUrl" label="Imagen" defaultValue={v.imageUrl} error={e.imageUrl} />
      <CheckField label="Controlar inventario" name="trackStock" defaultChecked={initial.trackStock}
        hint="Si no lo activas, el producto se muestra siempre como disponible." />
      <div className="grid gap-5 sm:grid-cols-2">
        {isNew && <Field label="Existencias iniciales" name="initialStock" type="number" min={0} defaultValue={v.initialStock} error={e.initialStock} />}
        <Field label="Avisar con existencias bajas desde" name="lowStockAt" type="number" min={0} defaultValue={v.lowStockAt} error={e.lowStockAt} />
      </div>
      <CheckField label="Producto activo (visible en la página)" name="isActive" defaultChecked={initial.isActive} />
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <Link href="/admin/productos" className={buttonClasses({ variant: "ghost" })}>Volver</Link>
      </div>
    </form>
  );
}
