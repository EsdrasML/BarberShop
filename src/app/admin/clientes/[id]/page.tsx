import { notFound } from "next/navigation";
import { updateCustomerAction } from "@/actions/admin/customers";
import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const c = await db.customer.findUnique({ where: { id } });
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.fullName} subtitle={c.userId ? "Tiene cuenta en el sistema." : "Registrado en el local, sin cuenta todavía."}>
        <Badge tone={c.userId ? "info" : "neutral"}>{c.userId ? "Con cuenta" : "Sin cuenta"}</Badge>
      </PageHeader>
      <CustomerForm
        action={updateCustomerAction.bind(null, id)}
        initial={{ fullName: c.fullName, phone: c.phone, email: c.email ?? "" }}
        emailLocked={Boolean(c.userId)}
      />
    </>
  );
}
