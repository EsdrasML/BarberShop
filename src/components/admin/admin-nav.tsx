"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (children: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const icons = {
  dashboard: icon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  calendar: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  sales: icon(<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />),
  walkin: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6 2 0 3.7.7 4.9 2M19 8v6M16 11h6" /></>),
  clients: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6" /></>),
  barbers: icon(<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.1 8.1 20 20M8.1 15.9 20 4" /></>),
  services: icon(<><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1.2" /></>),
  products: icon(<><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  business: icon(<><path d="M4 9l1-5h14l1 5" /><path d="M4 9v11h16V9" /><path d="M4 9a3 3 0 0 0 5 0 3 3 0 0 0 6 0 3 3 0 0 0 5 0" /></>),
  brand: icon(<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />),
};

type Item = { href: string; label: string; exact?: boolean; icon: React.ReactNode };

// Lo que ve el administrador de la barbería. Todos los módulos del administrador ya existen.
const adminItems: Item[] = [
  { href: "/admin", label: "Dashboard", exact: true, icon: icons.dashboard },
  { href: "/admin/citas", label: "Citas", icon: icons.calendar },
  { href: "/admin/clientes", label: "Clientes", icon: icons.clients },
  { href: "/admin/barberos", label: "Barberos", icon: icons.barbers },
  { href: "/admin/productos", label: "Productos", icon: icons.products },
  { href: "/admin/ventas", label: "Ventas", icon: icons.sales },
  { href: "/admin/walkin", label: "Walk-in", icon: icons.walkin },
];

// Configuración del sitio: solo el propietario de la plataforma.
const ownerItems: Item[] = [
  { href: "/admin/servicios", label: "Servicios y precios", icon: icons.services },
  { href: "/admin/sucursales", label: "Sucursales", icon: icons.business },
  { href: "/admin/administradores", label: "Administradores", icon: icons.clients },
  { href: "/admin/correo", label: "Correo", icon: icons.business },
  { href: "/admin/negocio", label: "Contacto y horarios", icon: icons.business },
  { href: "/admin/marca", label: "Marca y apariencia", icon: icons.brand },
];

export function AdminNav({ owner }: { owner: boolean }) {
  const pathname = usePathname();

  const render = (items: Item[]) =>
    items.map((i) => {
      const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
      return (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active ? "page" : undefined}
          className={`btn flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3.5 text-[0.95rem] ${active ? "bg-gold text-on-accent" : "text-smoke hover:bg-charcoal"}`}
        >
          {i.icon}
          {i.label}
        </Link>
      );
    });

  return (
    <nav aria-label="Administración" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      {render(adminItems)}
      {owner && (
        <>
          <p className="label-micro hidden px-4 pb-1 pt-6 text-ash lg:block">Solo propietario</p>
          {render(ownerItems)}
        </>
      )}
    </nav>
  );
}
