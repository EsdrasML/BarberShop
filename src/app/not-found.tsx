import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Página no encontrada", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-start justify-center px-6 py-20">
        <p className="label-micro text-gold-text">Error 404</p>
        <h1 className="display-secondary mt-4">Esta página no existe</h1>
        <p className="body-large mt-6 max-w-xl text-steel">
          Es posible que el enlace esté mal escrito o que la página ya no esté disponible. Vuelve al inicio o agenda tu cita.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/" className={buttonClasses({ variant: "accent" })}>Ir al inicio</Link>
          <Link href="/agendar" className={buttonClasses({ variant: "ghost" })}>Agendar cita</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
