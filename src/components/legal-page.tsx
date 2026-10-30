import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const LEGAL_UPDATED = "24 de octubre de 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-3xl px-6 py-14">
        <h1 className="section-heading">{title}</h1>
        <p className="mt-3 text-sm text-steel">Última actualización: {LEGAL_UPDATED}</p>
        <div className="mt-10 flex flex-col gap-8 text-smoke [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:uppercase [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p]:text-steel [&_li]:text-steel [&_a]:underline [&_strong]:font-medium [&_strong]:text-smoke">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
