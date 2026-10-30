"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Divider, FormAlert, GoogleButton } from "./form-parts";
import { ResendVerification } from "./resend-verification";

export function LoginForm({ googleEnabled, urlError, callbackUrl }: { googleEnabled: boolean; urlError?: string; callbackUrl: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  const error = state.error ?? urlError;
  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {error && <FormAlert>{error}</FormAlert>}
        <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
        <Link href="/recuperar" className="text-sm text-steel hover:text-gold-text">¿Olvidaste tu contraseña?</Link>
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Entrando…" : "Iniciar sesión"}</Button>
      </form>
      {state.needsVerification && state.values?.email && <ResendVerification email={state.values.email} />}
      <Divider />
      <GoogleButton enabled={googleEnabled} label="Continuar con Google" callbackUrl={callbackUrl} />
      <p className="text-sm text-steel">
        ¿No tienes cuenta? <Link href="/registro" className="text-white underline hover:text-gold-text">Regístrate</Link>
      </p>
    </div>
  );
}
