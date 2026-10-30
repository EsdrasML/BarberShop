import { notFound } from "next/navigation";
import { resendAdminInviteAction, updateAdminAction } from "@/actions/admin/admins";
import { AdminAccountForm, ResendAdminInvite } from "@/components/admin/admin-account-form";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export default async function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const [a, branches] = await Promise.all([
    db.user.findFirst({ where: { id, role: "ADMIN" } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  if (!a) notFound();
  return (
    <>
      <PageHeader title={a.name} subtitle={a.email} />
      <AdminAccountForm action={updateAdminAction.bind(null, id)} branches={branches} isNew={false} initial={{ name: a.name, email: a.email, branchId: a.branchId ?? "", isActive: a.isActive }} />
      {!a.passwordHash && <ResendAdminInvite resend={resendAdminInviteAction.bind(null, id)} email={a.email} />}
    </>
  );
}
