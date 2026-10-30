"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Props = {
  status: "none" | "pending" | "active";
  accountEmail?: string;
  invite: (p: FormState, fd: FormData) => Promise<FormState>;
  resend: (p: FormState) => Promise<FormState>;
};

export function InviteCard({ status, accountEmail, invite, resend }: Props) {
  const [inviteState, inviteAction, inviting] = useActionState(invite, {});
  const [resendState, resendAction, resending] = useActionState(resend, {});

  return (
    <Card tone="iron" className="max-w-2xl">
      <h2 className="feature-heading">Acceso al sistema</h2>
      {status === "active" && (
        <p className="mt-3 text-steel">Tiene acceso con <span className="text-white">{accountEmail}</span>. Entra a su propio panel con ese correo.</p>
      )}
      {status === "pending" && (
        <form action={resendAction} className="mt-3 flex flex-col gap-4">
          <p className="text-steel">Invitación enviada a <span className="text-white">{accountEmail}</span>. Aún no crea su contraseña.</p>
          {resendState.error && <FormAlert>{resendState.error}</FormAlert>}
          {resendState.message && <FormAlert tone="success">{resendState.message}</FormAlert>}
          <Button type="submit" variant="ghost" size="sm" disabled={resending} className="self-start">{resending ? "Enviando…" : "Reenviar invitación"}</Button>
        </form>
      )}
      {status === "none" && (
        <form action={inviteAction} className="mt-3 flex flex-col gap-4">
          <p className="text-steel">Para que el barbero vea su agenda, invítalo con su correo. Recibirá un enlace para crear su contraseña.</p>
          {inviteState.error && <FormAlert>{inviteState.error}</FormAlert>}
          {inviteState.message && <FormAlert tone="success">{inviteState.message}</FormAlert>}
          <Field label="Correo del barbero" name="email" type="email" required defaultValue={inviteState.values?.email} error={inviteState.fieldErrors?.email} />
          <Button type="submit" variant="accent" size="sm" disabled={inviting} className="self-start">{inviting ? "Enviando…" : "Enviar invitación"}</Button>
        </form>
      )}
    </Card>
  );
}
