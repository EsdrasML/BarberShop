import { BusinessForm } from "@/components/admin/business-form";
import { PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/session";
import { getShop } from "@/lib/shop";

export default async function BusinessPage() {
  await requireOwner();
  const s = await getShop();
  const initial: Record<string, string> = {
    phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "",
    hours: s.openingHours.map((h) => `${h.day} | ${h.hours}`).join("\n"),
    instagram: s.socialLinks.instagram ?? "", facebook: s.socialLinks.facebook ?? "",
    tiktok: s.socialLinks.tiktok ?? "", whatsapp: s.socialLinks.whatsapp ?? "",
    slotStepMinutes: String(s.slotStepMinutes), cancellationMinutes: String(s.cancellationMinutes),
    pointsPerService: String(s.pointsPerService), pointsForBenefit: String(s.pointsForBenefit), benefitPercent: String(s.benefitPercent),
  };
  return (
    <>
      <PageHeader title="Datos del negocio" subtitle="Contacto, horarios, redes y reglas. Solo visible para el propietario de la plataforma." />
      <BusinessForm initial={initial} />
    </>
  );
}
