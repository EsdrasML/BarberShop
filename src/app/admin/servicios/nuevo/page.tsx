import { createServiceAction } from "@/actions/admin/services";
import { PageHeader } from "@/components/admin/ui";
import { ServiceForm, emptyService } from "@/components/admin/service-form";
import { requireOwner } from "@/lib/session";

export default async function NewServicePage() {
  await requireOwner();
  return (
    <>
      <PageHeader title="Nuevo servicio" />
      <ServiceForm action={createServiceAction} initial={emptyService} />
    </>
  );
}
