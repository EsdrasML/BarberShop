"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button, buttonClasses } from "@/components/ui/button";
import { CheckField, Field, TextAreaField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { ImageField } from "./image-field";

type Initial = { name: string; description: string; price: string; durationMinutes: string; imageUrl: string; sortOrder: string; isActive: boolean };
export const emptyService: Initial = { name: "", description: "", price: "", durationMinutes: "50", imageUrl: "", sortOrder: "0", isActive: true };

export function ServiceForm({ action, initial }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; initial: Initial }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre" name="name" required defaultValue={v.name} error={e.name} />
      <TextAreaField label="Descripción" name="description" defaultValue={v.description} error={e.description} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Precio (Q)" name="price" inputMode="decimal" required defaultValue={v.price} error={e.price} />
        <Field label="Duración (min)" name="durationMinutes" type="number" min={5} max={480} required defaultValue={v.durationMinutes} error={e.durationMinutes} />
        <Field label="Orden" name="sortOrder" type="number" min={0} defaultValue={v.sortOrder} error={e.sortOrder} />
      </div>
      <ImageField name="imageUrl" label="Imagen (opcional)" defaultValue={v.imageUrl} error={e.imageUrl} />
      <CheckField label="Servicio activo (visible y reservable)" name="isActive" defaultChecked={initial.isActive} />
      <p className="text-sm text-steel">Cambiar el precio no modifica las citas ni ventas ya registradas.</p>
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <Link href="/admin/servicios" className={buttonClasses({ variant: "ghost" })}>Volver</Link>
      </div>
    </form>
  );
}
