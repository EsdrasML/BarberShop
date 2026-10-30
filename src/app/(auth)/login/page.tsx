import { redirect } from "next/navigation";
import { googleEnabled } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { safeCallback } from "@/lib/callback";
import { homeByRole } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

const urlErrors: Record<string, string> = {
  OAuthAccountNotLinked: "Ese correo ya está registrado con contraseña. Inicia sesión con tu correo y contraseña.",
  AccessDenied: "No tienes permiso para acceder.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  const callback = safeCallback(callbackUrl);
  const user = await getCurrentUser();
  if (user) redirect(callback === "/cuenta" ? homeByRole[user.role] : callback);

  const urlError = error ? (urlErrors[error] ?? "No se pudo iniciar sesión. Inténtalo de nuevo.") : undefined;

  return (
    <Card>
      <h1 className="sub-section mb-8">Iniciar sesión</h1>
      <LoginForm googleEnabled={googleEnabled} urlError={urlError} callbackUrl={callback} />
    </Card>
  );
}
