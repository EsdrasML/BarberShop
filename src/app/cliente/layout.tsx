import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TabNav } from "@/components/tab-nav";
import { requireRole } from "@/lib/session";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CLIENT");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-6 py-12 md:px-10">
        <TabNav
          items={[
            { href: "/cliente", label: "Mi perfil", exact: true },
            { href: "/cliente/citas", label: "Citas" },
            { href: "/cliente/puntos", label: "Puntos" },
            { href: "/cuenta/seguridad", label: "Contraseña" },
          ]}
        />
        <div className="mt-10">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
