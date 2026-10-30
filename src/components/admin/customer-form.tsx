"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Initial = { fullName: string; phone: string; email: string };

export function CustomerForm({ action, initial, emailLocked = false }: { action: (p: FormState, fd: FormData) => Promise<FormState>; initial: Initial; emailLocked?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre completo" name="fullName" required defaultValue={v.fullName} error={e.fullName} />
      <Field label="Teléfono" name="phone" type="tel" required defaultValue={v.phone} error={e.phone} />
      <Field label="Correo electrónico (opcional)" name="email" type="email" defaultValue={v.email} error={e.email} disabled={emailLocked}
        hint={emailLocked ? "Este cliente ya tiene cuenta: el correo es el de su cuenta." : "Si el cliente se registra después con este correo, verá su historial y sus puntos."} />
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <Link href="/admin/clientes" className={buttonClasses({ variant: "ghost" })}>Volver</Link>
      </div>
    </form>
  );
}
