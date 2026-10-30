import { createBarberAction } from "@/actions/admin/barbers";
import { BarberForm, emptyBarber } from "@/components/admin/barber-form";
import { PageHeader } from "@/components/admin/ui";
import { getActiveBranches } from "@/lib/branches";
import { isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";

export default async function NewBarberPage() {
  const user = await requireRole("ADMIN");
  const branches = isBranchScoped(user) ? [] : await getActiveBranches(); // el administrador de sucursal crea barberos de su sucursal
  return (
    <>
      <PageHeader title="Nuevo barbero" subtitle="Después podrás definir su horario e invitarlo al sistema." />
      <BarberForm action={createBarberAction} initial={emptyBarber} branches={branches} />
    </>
  );
}
