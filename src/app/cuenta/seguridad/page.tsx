import Link from "next/link";
import { PasswordForm } from "@/components/account/password-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { homeByRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Cambiar contraseña", robots: { index: false, follow: false } };

export default async function SecurityPage() {
  const user = await requireUser();
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-md px-6 py-12">
        <Link href={homeByRole[user.role]} className="text-sm text-steel hover:text-gold-text">← Volver</Link>
        <Card className="mt-6">
          <h1 className="sub-section mb-8">Cambiar contraseña</h1>
          <PasswordForm hasPassword={Boolean(row?.passwordHash)} />
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
