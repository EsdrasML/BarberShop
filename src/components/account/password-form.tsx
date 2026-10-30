"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/account";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      {hasPassword ? (
        <Field label="Contraseña actual" name="currentPassword" type="password" autoComplete="current-password" required error={e.currentPassword} />
      ) : (
        <>
          <input type="hidden" name="currentPassword" value="" />
          <p className="text-sm text-steel">Tu cuenta usa Google. Puedes definir una contraseña para entrar también con tu correo.</p>
        </>
      )}
      <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" required minLength={8}
        hint="Mínimo 8 caracteres, con letras y números." error={e.password} />
      <Field label="Confirmar nueva contraseña" name="confirmPassword" type="password" autoComplete="new-password" required error={e.confirmPassword} />
      <Button type="submit" variant="accent" disabled={pending} className="self-start">{pending ? "Guardando…" : "Cambiar contraseña"}</Button>
    </form>
  );
}
