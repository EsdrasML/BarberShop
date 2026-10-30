"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { CheckField, Field } from "@/components/ui/input";
import { Divider, FormAlert, GoogleButton } from "./form-parts";
import { ResendVerification } from "./resend-verification";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(registerAction, {});
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.message) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert tone="success">{state.message}</FormAlert>
        {state.error && <FormAlert>{state.error}</FormAlert>}
        <p className="text-sm text-steel">¿No lo ves? Revisa la carpeta de spam o pide otro correo.</p>
        {v.email && <ResendVerification email={v.email} />}
        <Link href="/login" className="text-sm text-white underline hover:text-gold-text">Ir a iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-5">
        {state.error && <FormAlert>{state.error}</FormAlert>}
        <Field label="Nombre completo" name="fullName" autoComplete="name" required defaultValue={v.fullName} error={e.fullName} />
        <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required defaultValue={v.email} error={e.email} />
        <Field label="Teléfono" name="phone" type="tel" autoComplete="tel" required defaultValue={v.phone} error={e.phone} />
        <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required minLength={8}
          hint="Mínimo 8 caracteres, con letras y números." error={e.password} />
        <Field label="Confirmar contraseña" name="confirmPassword" type="password" autoComplete="new-password" required error={e.confirmPassword} />
        <CheckField name="terms" required error={e.terms}
          label={<span className="text-sm">Acepto los <Link href="/terminos" target="_blank" className="underline hover:text-gold-text">términos y condiciones</Link> y la <Link href="/privacidad" target="_blank" className="underline hover:text-gold-text">política de privacidad</Link></span>} />
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}</Button>
      </form>
      <Divider />
      <GoogleButton enabled={googleEnabled} label="Registrarse con Google" />
      <p className="text-sm text-steel">
        ¿Ya tienes cuenta? <Link href="/login" className="text-white underline hover:text-gold-text">Inicia sesión</Link>
      </p>
    </div>
  );
}
