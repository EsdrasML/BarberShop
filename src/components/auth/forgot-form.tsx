"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { FormAlert } from "./form-parts";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required
        defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <Button type="submit" variant="accent" disabled={pending}>{pending ? "Enviando…" : "Enviar enlace"}</Button>
      <Link href="/login" className="text-sm text-steel hover:text-gold-text">Volver a iniciar sesión</Link>
    </form>
  );
}
