"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button, buttonClasses } from "@/components/ui/button";
import { CheckField, Field, TextAreaField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { ImageField } from "./image-field";

type Initial = { branchIds: string[]; displayName: string; bio: string; phone: string; email: string; photoUrl: string; isActive: boolean; canRegisterPayments: boolean; canViewRevenue: boolean };
export const emptyBarber: Initial = { branchIds: [], displayName: "", bio: "", phone: "", email: "", photoUrl: "", isActive: true, canRegisterPayments: false, canViewRevenue: false };

export function BarberForm({ action, initial, branches }: { action: (p: FormState, fd: FormData) => Promise<FormState>; initial: Initial; branches: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre" name="displayName" required defaultValue={v.displayName} error={e.displayName} />
      <TextAreaField label="Presentación (opcional)" name="bio" defaultValue={v.bio} error={e.bio} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teléfono" name="phone" type="tel" defaultValue={v.phone} error={e.phone} />
        <Field label="Correo de contacto" name="email" type="email" defaultValue={v.email} error={e.email} />
      </div>
      {branches.length > 1 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="label-micro mb-1 text-steel">Sucursales donde atiende</legend>
          {branches.map((b) => <CheckField key={b.id} label={b.name} name="branchIds" value={b.id} defaultChecked={initial.branchIds.includes(b.id)} />)}
          <p className="text-sm text-steel">Sin ninguna marcada, atiende en todas.</p>
        </fieldset>
      )}
      <ImageField name="photoUrl" label="Fotografía" defaultValue={v.photoUrl} error={e.photoUrl} />
      <CheckField label="Perfil activo (puede recibir citas)" name="isActive" defaultChecked={initial.isActive}
        hint="Desactivarlo no borra su historial, ventas ni estadísticas. Si tiene acceso al sistema, también se bloquea." />
      <p className="rounded-xl border border-dashed border-graphite p-4 text-sm text-steel">Los clientes solo pueden reservar con barberos que tengan un horario definido (pestaña «Horario»). Un barbero sin horario atiende únicamente por orden de llegada (walk-in).</p>
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <Link href="/admin/barberos" className={buttonClasses({ variant: "ghost" })}>Volver</Link>
      </div>
    </form>
  );
}
