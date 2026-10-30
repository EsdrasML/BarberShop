import { EmailTestForm } from "@/components/admin/email-test-form";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { emailProvider } from "@/lib/email";
import { requireOwner } from "@/lib/session";

const names = { smtp: "SMTP (por ejemplo Gmail)", resend: "Resend" } as const;

export default async function EmailPage() {
  const owner = await requireOwner();
  const provider = emailProvider();
  return (
    <>
      <PageHeader title="Correo" subtitle="Solo visible para el propietario. De aquí salen la verificación de cuentas, la recuperación de contraseña y las invitaciones." />
      <Card tone="iron" className="mb-8 max-w-xl">
        <p className="label-micro text-steel">Proveedor</p>
        <p className="mt-2 flex items-center gap-3 text-lg">
          {provider ? names[provider] : "Sin configurar"} <Badge tone={provider ? "done" : "danger"}>{provider ? "Configurado" : "Falta configurar"}</Badge>
        </p>
        {provider && <p className="mt-2 text-sm text-steel">Remitente: {process.env.EMAIL_FROM}</p>}
        {!provider && <p className="mt-3 text-sm text-steel">Sin proveedor, los correos NO se envían. Sigue docs/CORREO.md y reinicia el servidor.</p>}
      </Card>
      <EmailTestForm defaultTo={owner.email} />
      <p className="mt-6 max-w-xl text-sm text-steel">
        Si la prueba falla, el mensaje de error es el que devuelve el proveedor: es la pista exacta de qué corregir. Con Resend sin dominio propio verificado, solo se puede enviar a tu propio correo de Resend.
      </p>
    </>
  );
}
