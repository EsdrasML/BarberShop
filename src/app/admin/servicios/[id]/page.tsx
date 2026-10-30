import { notFound } from "next/navigation";
import { updateServiceAction } from "@/actions/admin/services";
import { PageHeader } from "@/components/admin/ui";
import { ServiceForm } from "@/components/admin/service-form";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const s = await db.service.findFirst({ where: { id, deletedAt: null } });
  if (!s) notFound();
  return (
    <>
      <PageHeader title="Editar servicio" />
      <ServiceForm
        action={updateServiceAction.bind(null, id)}
        initial={{
          name: s.name, description: s.description ?? "", price: (s.priceCents / 100).toFixed(2),
          durationMinutes: String(s.durationMinutes), imageUrl: s.imageUrl ?? "", sortOrder: String(s.sortOrder), isActive: s.isActive,
        }}
      />
    </>
  );
}
