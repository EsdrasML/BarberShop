"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

export function CancelForm({ action }: { action: (p: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("¿Cancelar esta cita? El horario quedará libre.")) e.preventDefault(); }} className="flex max-w-md flex-col gap-4">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <Field label="Motivo (opcional)" name="reason" maxLength={200} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="self-start text-danger">{pending ? "Cancelando…" : "Cancelar cita"}</Button>
    </form>
  );
}
