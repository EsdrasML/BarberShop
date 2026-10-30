import { createAdminAction } from "@/actions/admin/admins";
import { AdminAccountForm } from "@/components/admin/admin-account-form";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export default async function NewAdminPage() {
  await requireOwner();
  const branches = await db.branch.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Nuevo administrador" />
      <AdminAccountForm action={createAdminAction} branches={branches} isNew initial={{ name: "", email: "", branchId: "", isActive: true }} />
    </>
  );
}
