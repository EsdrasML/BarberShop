"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { FormAlert } from "./form-parts";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  const e = state.fieldErrors ?? {};
  if (state.message) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="success">{state.message}</FormAlert>
        <Link href="/login" className={buttonClasses({ variant: "accent" })}>Iniciar sesión</Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <input type="hidden" name="token" value={token} />
      <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" required minLength={8}
        hint="Mínimo 8 caracteres, con letras y números." error={e.password ?? e.token} />
      <Field label="Confirmar contraseña" name="confirmPassword" type="password" autoComplete="new-password" required error={e.confirmPassword} />
      <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar contraseña"}</Button>
    </form>
  );
}
