import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ensureCustomerForUser } from "@/lib/customers";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/verification";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;

  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const record = await db.verificationToken.findUnique({ where: { token: sha256(token) } });
    if (record && record.expires > new Date()) {
      await db.$transaction([
        db.user.updateMany({ where: { email: record.identifier, emailVerified: null }, data: { emailVerified: new Date() } }),
        db.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
      ]);
      const user = await db.user.findUnique({ where: { email: record.identifier } });
      if (user && user.role === "CLIENT") await ensureCustomerForUser(user);
      ok = true;
    }
  }

  return (
    <Card>
      <h1 className="sub-section mb-4">{ok ? "Cuenta verificada" : "Enlace no válido"}</h1>
      <p className="mb-8 text-steel">
        {ok
          ? "Tu correo quedó verificado. Ya puedes iniciar sesión."
          : "El enlace venció o ya fue usado. Si ya verificaste tu correo, inicia sesión. Si no, pide un nuevo correo desde la pantalla de inicio de sesión."}
      </p>
      <Link href="/login" className={buttonClasses({ variant: "accent" })}>Iniciar sesión</Link>
    </Card>
  );
}
