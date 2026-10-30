"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { InviteLink } from "@/components/auth/invite-link";
import { Button, buttonClasses } from "@/components/ui/button";
import { CheckField, Field, SelectField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Props = {
  action: (p: FormState, fd: FormData) => Promise<FormState>;
  branches: Array<{ id: string; name: string }>;
  initial: { name: string; email: string; branchId: string; isActive: boolean };
  isNew: boolean;
};

export function AdminAccountForm({ action, branches, initial, isNew }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.link && <InviteLink link={state.link} />}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Nombre completo" name="name" required defaultValue={v.name} error={e.name} disabled={!isNew} />
      <Field label="Correo electrónico" name="email" type="email" required defaultValue={v.email} error={e.email} disabled={!isNew}
        hint={isNew ? "Recibirá un correo para crear su contraseña." : undefined} />
      <SelectField label="Sucursal" name="branchId" defaultValue={v.branchId} error={e.branchId}
        hint="Con sucursal, solo ve y cobra lo de esa sucursal. «Todas» es para un administrador general.">
        <option value="">Todas las sucursales</option>
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </SelectField>
      {!isNew && <CheckField label="Cuenta activa" name="isActive" defaultChecked={initial.isActive} hint="Desactivarla impide que inicie sesión; su historial se conserva." />}
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : isNew ? "Crear e invitar" : "Guardar"}</Button>
        <Link href="/admin/administradores" className={buttonClasses({ variant: "ghost" })}>Volver</Link>
      </div>
    </form>
  );
}

export function ResendAdminInvite({ resend, email }: { resend: (p: FormState) => Promise<FormState>; email: string }) {
  const [state, action, pending] = useActionState(resend, {});
  return (
    <form action={action} className="mt-6 flex max-w-xl flex-col gap-3">
      <p className="text-sm text-steel">Invitación enviada a <span className="text-white">{email}</span>. Aún no crea su contraseña.</p>
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.link && <InviteLink link={state.link} />}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="self-start">{pending ? "Enviando…" : "Reenviar invitación"}</Button>
    </form>
  );
}
