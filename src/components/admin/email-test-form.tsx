"use client";

import { useActionState } from "react";
import { sendTestEmailAction } from "@/actions/admin/email-test";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";

export function EmailTestForm({ defaultTo }: { defaultTo: string }) {
  const [state, action, pending] = useActionState(sendTestEmailAction, {});
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Enviar correo de prueba a" name="to" type="email" required defaultValue={defaultTo} error={state.fieldErrors?.to} />
      <Button type="submit" variant="accent" size="sm" disabled={pending} className="self-start">{pending ? "Enviando…" : "Enviar prueba"}</Button>
    </form>
  );
}
