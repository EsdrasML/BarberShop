import Link from "next/link";
import { BookingFlow } from "@/components/booking/booking-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MAX_DAYS_AHEAD } from "@/lib/booking";
import { getActiveBranches } from "@/lib/branches";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getPublicServices, getShop } from "@/lib/shop";
import { utcToLocalInputs } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agendar cita", robots: { index: false, follow: false } };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ servicio?: string }> }) {
  const user = await requireRole("CLIENT");
  const { servicio } = await searchParams;
  const [shop, services, barbers, customer, branches] = await Promise.all([
    getShop(),
    getPublicServices(),
    db.barber.findMany({
      where: { isActive: true, deletedAt: null, workingHours: { some: {} } }, // solo barberos con horario definido
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, bio: true, photoUrl: true, branches: { select: { id: true } } },
    }),
    db.customer.findUnique({ where: { userId: user.id }, select: { phone: true } }),
    getActiveBranches(),
  ]);

  const now = new Date();
  const minDate = utcToLocalInputs(now, shop.timezone).date;
  const maxDate = utcToLocalInputs(new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000), shop.timezone).date;
  const ready = services.length > 0 && barbers.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-6 py-12 md:px-10">
        <h1 className="section-heading mb-10">Agendar cita</h1>
        {ready ? (
          <BookingFlow
            services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, priceCents: s.priceCents, durationMinutes: s.durationMinutes }))}
            barbers={barbers.map((b) => ({ id: b.id, displayName: b.displayName, bio: b.bio, photoUrl: b.photoUrl, branchIds: b.branches.map((x) => x.id) }))}
            branches={branches}
            phone={customer?.phone ?? user.phone ?? ""}
            minDate={minDate} maxDate={maxDate} tz={shop.timezone} initialServiceId={servicio}
          />
        ) : (
          <Card tone="iron" className="flex flex-col items-start gap-4">
            <p className="text-steel">Las reservas en línea aún no están disponibles. Vuelve pronto o comunícate con la barbería.</p>
            <Link href="/" className={buttonClasses({ variant: "ghost" })}>Volver al inicio</Link>
          </Card>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
