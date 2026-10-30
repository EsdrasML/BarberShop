import { createBranchAction } from "@/actions/admin/branches";
import { BranchForm } from "@/components/admin/branch-form";
import { PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/session";

export default async function NewBranchPage() {
  await requireOwner();
  return (
    <>
      <PageHeader title="Nueva sucursal" />
      <BranchForm action={createBranchAction} initial={{ name: "", address: "", phone: "", sortOrder: "0", isActive: true }} />
    </>
  );
}
