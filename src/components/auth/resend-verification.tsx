"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormAlert } from "./form-parts";

export function ResendVerification({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Enviando…" : "Reenviar correo de verificación"}
      </Button>
    </form>
  );
}
