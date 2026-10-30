import Link from "next/link";
import { notFound } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { db } from "@/lib/db";
import { assertBarberAccess } from "@/lib/scope";
import { requireRole } from "@/lib/session";

export default async function BarberLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN");
  const { id } = await params;
  await assertBarberAccess(user, id);
  const barber = await db.barber.findFirst({ where: { id, deletedAt: null }, select: { displayName: true } });
  if (!barber) notFound();
  return (
    <>
      <Link href="/admin/barberos" className="text-sm text-steel hover:text-gold-text">← Barberos</Link>
      <h1 className="sub-section mb-6 mt-3">{barber.displayName}</h1>
      <TabNav
        label="Barbero"
        items={[
          { href: `/admin/barberos/${id}`, label: "Perfil", exact: true },
          { href: `/admin/barberos/${id}/horario`, label: "Horario" },
          { href: `/admin/barberos/${id}/ausencias`, label: "Ausencias" },
        ]}
      />
      <div className="mt-8">{children}</div>
    </>
  );
}
