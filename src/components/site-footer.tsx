import Link from "next/link";
import { db } from "@/lib/db";
import { getShop } from "@/lib/shop";

const safeUrl = (u: string) => /^https?:\/\//i.test(u);

export async function SiteFooter() {
  const shop = await getShop();
  const branches = await db.branch.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const social = Object.entries(shop.socialLinks).filter(([, url]) => safeUrl(url));
  const hasContact = Boolean(shop.phone || shop.email || shop.address);
  const heading = "label-micro mb-4 text-steel";
  const link = "text-sm text-smoke hover:text-gold-text";

  return (
    <footer className="border-t border-charcoal bg-black">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-14 md:grid-cols-4 md:px-10">
        <div>
          <p className="text-lg uppercase tracking-[0.12em]">{shop.name}</p>
          <p className="mt-4 max-w-xs text-sm text-steel">{shop.tagline}</p>
        </div>

        <nav aria-label="Enlaces del pie">
          <p className={heading}>Navegación</p>
          <ul className="flex flex-col gap-3">
            <li><Link href="/#servicios" className={link}>Servicios</Link></li>
            <li><Link href="/#conocenos" className={link}>Conócenos</Link></li>
            <li><Link href="/agendar" className={link}>Agendar cita</Link></li>
            <li><Link href="/#productos" className={link}>Productos</Link></li>
            <li><Link href="/login" className={link}>Iniciar sesión</Link></li>
          </ul>
        </nav>

        <div>
          <p className={heading}>Contacto</p>
          {hasContact ? (
            <ul className="flex flex-col gap-3">
              {shop.address && <li className="text-sm text-smoke">{shop.address}</li>}
              {shop.phone && <li><a href={`tel:${shop.phone.replace(/\s/g, "")}`} className={link}>{shop.phone}</a></li>}
              {shop.email && <li><a href={`mailto:${shop.email}`} className={link}>{shop.email}</a></li>}
            </ul>
          ) : (
            <p className="text-sm text-steel">Datos de contacto por configurar.</p>
          )}
          {branches.length > 1 && (
            <ul className="mt-5 flex flex-col gap-3">
              {branches.map((b) => (
                <li key={b.id} className="text-sm"><span className="text-smoke">{b.name}</span>{b.address && <span className="block text-steel">{b.address}</span>}{b.phone && <span className="block text-steel">{b.phone}</span>}</li>
              ))}
            </ul>
          )}
          {social.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className={`${link} capitalize`}>{name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className={heading}>Horarios</p>
          {shop.openingHours.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {shop.openingHours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4 text-sm">
                  <span className="text-smoke">{h.day}</span>
                  <span className="text-steel">{h.hours}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-steel">Horarios por configurar.</p>
          )}
        </div>
      </div>
      <div className="border-t border-charcoal px-6 py-5 text-center text-xs text-ash">
        © {new Date().getFullYear()} {shop.name}. Todos los derechos reservados. ·{" "}
        <Link href="/privacidad" className="underline hover:text-gold-text">Privacidad</Link> ·{" "}
        <Link href="/terminos" className="underline hover:text-gold-text">Términos</Link>
      </div>
    </footer>
  );
}
