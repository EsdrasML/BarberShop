import Link from "next/link";
import { ResetForm } from "@/components/auth/reset-form";
import { Card } from "@/components/ui/card";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <Card>
      <h1 className="sub-section mb-8">Nueva contraseña</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-steel">
          El enlace no es válido. <Link href="/recuperar" className="text-white underline">Pide uno nuevo</Link>.
        </p>
      )}
    </Card>
  );
}
