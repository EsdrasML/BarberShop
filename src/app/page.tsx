import Link from "next/link";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/site";
import { getPublicProducts, getPublicServices, getShop } from "@/lib/shop";

export const dynamic = "force-dynamic";

// La dirección «canónica» de la portada le dice a Google cuál es la versión oficial de la página.
export const metadata = { alternates: { canonical: "/" } };

/** Datos estructurados (schema.org): Google los usa para mostrar la barbería en búsquedas locales y en Maps. */
function localBusinessJsonLd(shop: Awaited<ReturnType<typeof getShop>>, branches: Array<{ name: string; address: string | null; phone: string | null }>) {
  const url = siteUrl();
  const sameAs = Object.values(shop.socialLinks).filter((u) => /^https?:\/\//.test(u));
  const image = shop.heroImageUrl ?? shop.logoUrl ?? undefined;
  const one = (name: string, address: string | null, phone: string | null) => ({
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name,
    url,
    ...(image ? { image } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(shop.email ? { email: shop.email } : {}),
    ...(address || shop.city ? { address: { "@type": "PostalAddress", ...(address ? { streetAddress: address } : {}), ...(shop.city ? { addressLocality: shop.city } : {}), addressCountry: "GT" } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  });
  if (branches.length > 1) return branches.map((b) => one(`${shop.name} · ${b.name}`, b.address ?? shop.address, b.phone ?? shop.phone));
  return [one(shop.name, branches[0]?.address ?? shop.address, branches[0]?.phone ?? shop.phone)];
}

const values = [
  ["Experiencia", "Cada corte con técnica y cuidado."],
  ["Profesionalismo", "Atención cercana y servicio de calidad."],
  ["Estilo", "Asesoría para que tu imagen hable por ti."],
];

export default async function Home() {
  const [shop, services, products, branches] = await Promise.all([
    getShop(), getPublicServices(), getPublicProducts(),
    db.branch.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, address: true, phone: true } }),
  ]);
  const jsonLd = JSON.stringify(localBusinessJsonLd(shop, branches)).replace(/</g, "\\u003c");
  const about =
    shop.about ||
    "Un espacio pensado para el cuidado del hombre: cortes de cabello, arreglo de barba y asesoría de imagen.";
  const gallery = shop.galleryUrls.slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SiteHeader />
      <main>
        {/* Hero */}
        <section id="inicio" className="relative isolate flex min-h-[88vh] items-end overflow-hidden">
          {shop.heroImageUrl ? (
            <div
              className="absolute inset-0 -z-20 bg-cover bg-center"
              style={{ backgroundImage: `url("${shop.heroImageUrl.replace(/"/g, "%22")}")` }}
            />
          ) : (
            <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top_right,#2a2208_0%,#000_62%)]" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/20" />
          <div className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-32 md:px-10">
            <p className="label-micro text-gold-text">{shop.heroTitle}</p>
            <h1 className="display-hero mt-5 max-w-5xl">{shop.tagline}</h1>
            <p className="body-large mt-8 max-w-xl text-smoke/80">{shop.heroSubtitle}</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/agendar" className={buttonClasses({ variant: "accent", size: "lg" })}>Agendar cita</Link>
              <Link href="#servicios" className={buttonClasses({ variant: "ghost", size: "lg" })}>Ver servicios</Link>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="scroll-mt-20 bg-iron py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-6 md:px-10">
            <h2 className="section-heading">Servicios</h2>
            {services.length === 0 ? (
              <p className="mt-8 text-steel">Pronto publicaremos nuestros servicios.</p>
            ) : (
              <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {services.map((s, i) => (
                  <Card key={s.id} className="flex flex-col">
                    {s.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUrl} alt="" loading="lazy" className="mb-6 aspect-[4/3] w-full rounded-xl object-cover" />
                    )}
                    <p className="label-micro text-ash">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="feature-heading mt-2">{s.name}</h3>
                    {s.description && <p className="mt-3 text-sm text-steel">{s.description}</p>}
                    <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                      <div>
                        <p className="sub-section">{formatMoney(s.priceCents)}</p>
                        <p className="mt-1 text-sm text-steel">{s.durationMinutes} min</p>
                      </div>
                      <Link href={`/agendar?servicio=${s.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                        Reservar
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Conócenos */}
        <section id="conocenos" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-14 px-6 md:px-10 lg:grid-cols-2">
            <div>
              <h2 className="section-heading">Conócenos</h2>
              <p className="body-large mt-6 max-w-xl text-steel">{about}</p>
              <ul className="mt-10 grid gap-6 sm:grid-cols-3">
                {values.map(([title, text]) => (
                  <li key={title} className="border-t border-graphite pt-4">
                    <p className="feature-heading text-[1.25rem]">{title}</p>
                    <p className="mt-2 text-sm text-steel">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2].map((i) =>
                gallery[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={gallery[i]} alt="" loading="lazy"
                    className={`w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`} />
                ) : (
                  <ImagePlaceholder key={i} className={i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"} />
                ),
              )}
            </div>
          </div>
        </section>

        {/* Productos */}
        <section id="productos" className="scroll-mt-20 bg-iron py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-6 md:px-10">
            <h2 className="section-heading">Productos</h2>
            <p className="body-large mt-4 max-w-xl text-steel">Cuidado personal masculino. Consulta disponibilidad en la barbería.</p>
            {products.length === 0 ? (
              <p className="mt-10 text-steel">Estamos preparando nuestro catálogo de productos.</p>
            ) : (
              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p) => {
                  const available = !p.trackStock || p.stock > 0;
                  return (
                    <Card key={p.id} className="flex flex-col p-4 md:p-4">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                      ) : (
                        <ImagePlaceholder className="aspect-square" label="Sin imagen" />
                      )}
                      <div className="flex flex-1 flex-col gap-2 px-2 pb-2 pt-5">
                        <h3 className="feature-heading text-[1.25rem]">{p.name}</h3>
                        {p.description && <p className="text-sm text-steel">{p.description}</p>}
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <p className="text-lg">{formatMoney(p.priceCents)}</p>
                          <Badge tone={available ? "info" : "neutral"}>{available ? "Disponible" : "Agotado"}</Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
