"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/account";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre completo" name="fullName" autoComplete="name" required defaultValue={state.values?.fullName ?? fullName} error={e.fullName} />
      <Field label="Teléfono" name="phone" type="tel" autoComplete="tel" required defaultValue={state.values?.phone ?? phone} error={e.phone}
        hint={phone ? undefined : "Agrega tu teléfono para poder reservar citas."} />
      <Field label="Correo electrónico" name="email" type="email" value={email} readOnly disabled hint="El correo no se puede cambiar." />
      <Button type="submit" variant="accent" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar cambios"}</Button>
    </form>
  );
}
