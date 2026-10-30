import { BrandForm } from "@/components/admin/brand-form";
import { PageHeader } from "@/components/admin/ui";
import { r2Configured } from "@/lib/r2";
import { requireOwner } from "@/lib/session";
import { getShop } from "@/lib/shop";

export default async function BrandPage() {
  await requireOwner(); // el administrador del negocio no puede entrar aquí
  const s = await getShop();
  const initial: Record<string, string> = {
    name: s.name, tagline: s.tagline, heroTitle: s.heroTitle, heroSubtitle: s.heroSubtitle, about: s.about,
    logoUrl: s.logoUrl ?? "", heroImageUrl: s.heroImageUrl ?? "",
    gallery1: s.galleryUrls[0] ?? "", gallery2: s.galleryUrls[1] ?? "", gallery3: s.galleryUrls[2] ?? "",
    accentColor: s.accentColor, timezone: s.timezone,
    seoTitle: s.seoTitle ?? "", seoDescription: s.seoDescription ?? "", city: s.city ?? "",
  };
  return (
    <>
      <PageHeader title="Marca y apariencia" subtitle="Solo visible para el propietario de la plataforma." />
      <BrandForm initial={initial} r2Ready={r2Configured()} />
    </>
  );
}
