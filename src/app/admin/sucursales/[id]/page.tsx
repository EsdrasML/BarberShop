import { notFound } from "next/navigation";
import { updateBranchAction } from "@/actions/admin/branches";
import { BranchForm } from "@/components/admin/branch-form";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const b = await db.branch.findUnique({ where: { id } });
  if (!b) notFound();
  return (
    <>
      <PageHeader title="Editar sucursal" />
      <BranchForm action={updateBranchAction.bind(null, id)} initial={{ name: b.name, address: b.address ?? "", phone: b.phone ?? "", sortOrder: String(b.sortOrder), isActive: b.isActive }} />
    </>
  );
}
