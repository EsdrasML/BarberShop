import { createCustomerAction } from "@/actions/admin/customers";
import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/admin/ui";
import { requireRole } from "@/lib/session";

export default async function NewCustomerPage() {
  await requireRole("ADMIN");
  return (
    <>
      <PageHeader title="Registrar cliente" subtitle="Para quien llega al local sin cita. Basta con nombre y teléfono." />
      <CustomerForm action={createCustomerAction} initial={{ fullName: "", phone: "", email: "" }} />
    </>
  );
}
