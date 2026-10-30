import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { UserMenu } from "@/components/user-menu";
import { buttonClasses } from "@/components/ui/button";
import { menuItemsFor } from "@/lib/menu";
import { getPointsBalance } from "@/lib/points";
import { getCurrentUser } from "@/lib/session";
import { getShop } from "@/lib/shop";

const centerLinks = [
  ["Servicios", "/#servicios"],
  ["Conócenos", "/#conocenos"],
  ["Agendar cita", "/agendar"],
  ["Productos", "/#productos"],
];

const linkClass = "caption text-smoke hover:text-gold-text";

export async function SiteHeader() {
  const [shop, user] = await Promise.all([getShop(), getCurrentUser()]);
  const points = user?.role === "CLIENT" ? await getPointsBalance(user.id) : null;
  const items = user ? menuItemsFor(user.role) : [];

  return (
    <header className="sticky top-0 z-10 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:px-10">
        <Link href="/" className="flex items-center gap-3 text-lg uppercase tracking-[0.12em]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shop.logoUrl && <img src={shop.logoUrl} alt="" className="size-9 rounded-full object-cover" />}
          {shop.name}
        </Link>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Principal">
          {centerLinks.map(([name, href]) => (
            <Link key={name} href={href} className={linkClass}>{name}</Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-3 md:flex">
          {user ? (
            <UserMenu name={user.name} email={user.email} items={items} points={points} />
          ) : (
            <>
              <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>Iniciar sesión</Link>
              <Link href="/registro" className={buttonClasses({ variant: "accent", size: "sm" })}>Registrarse</Link>
            </>
          )}
        </div>

        {/* Móvil: menú compacto sin JavaScript */}
        <details className="relative md:hidden">
          <summary className="caption cursor-pointer list-none rounded-full border border-white/50 px-4 py-2 text-white [&::-webkit-details-marker]:hidden">
            Menú
          </summary>
          <div className="absolute right-0 top-full mt-2 flex w-72 flex-col gap-4 rounded-2xl border border-graphite bg-charcoal p-6">
            {user && (
              <div>
                <p className="truncate">{user.name}</p>
                {points !== null && <p className="text-sm text-gold-text">{points} puntos acumulados</p>}
              </div>
            )}
            {centerLinks.map(([name, href]) => (
              <Link key={name} href={href} className={linkClass}>{name}</Link>
            ))}
            {user ? (
              <>
                <div className="h-px bg-graphite" />
                {items.map((i) => (
                  <Link key={i.href} href={i.href} className={linkClass}>{i.label}</Link>
                ))}
                <form action={logoutAction}>
                  <button type="submit" className={buttonClasses({ variant: "ghost", size: "sm", className: "w-full" })}>Cerrar sesión</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>Iniciar sesión</Link>
                <Link href="/registro" className={buttonClasses({ variant: "accent", size: "sm" })}>Registrarse</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
