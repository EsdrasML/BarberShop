import Link from "next/link";
import { redirect } from "next/navigation";
import { chargeAppointmentAction } from "@/actions/admin/sales";
import { PageHeader } from "@/components/admin/ui";
import { FormAlert } from "@/components/auth/form-parts";
import { SaleForm } from "@/components/sales/sale-form";
import { getActiveBranches } from "@/lib/branches";
import { startedEnough } from "@/lib/appointment-status";
import { db } from "@/lib/db";
import { assertAppointmentAccess, isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

// Cobro de una cita: /admin/ventas/nueva?cita=ID
export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ cita?: string }> }) {
  const user = await requireRole("ADMIN");
  const { cita } = await searchParams;
  if (!cita) redirect("/admin/walkin");
  await assertAppointmentAccess(user, cita);

  const [shop, appt] = await Promise.all([
    getShop(),
    db.appointment.findUnique({ where: { id: cita }, include: { customer: true, service: { select: { name: true } } } }),
  ]);
  if (!appt) redirect("/admin/citas");

  const existing = await db.sale.findFirst({ where: { appointmentId: appt.id, status: { not: "VOID" } }, select: { id: true } });
  if (existing) redirect(`/admin/ventas/${existing.id}`);

  const allBranches = await getActiveBranches();
  const branches = isBranchScoped(user) ? allBranches.filter((b) => b.id === user.branchId) : allBranches;
  const [products, ledger] = await Promise.all([
    db.product.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }),
    db.pointsLedger.aggregate({ where: { customerId: appt.customerId }, _sum: { delta: true } }),
  ]);
  const chargeable = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(appt.status);
  const early = ["CONFIRMED", "IN_PROGRESS"].includes(appt.status) && !startedEnough("COMPLETED", appt.startsAt, new Date());

  return (
    <>
      <Link href={`/admin/citas/${appt.id}`} className="text-sm text-steel hover:text-gold-text">← Cita</Link>
      <div className="mt-3"><PageHeader title="Cobrar cita" subtitle="Suma productos si los hay, aplica el beneficio de puntos y registra el pago." /></div>
      {early ? (
        <FormAlert>Aún no llega la hora de esta cita. Podrás completarla y cobrarla desde 15 minutos antes.</FormAlert>
      ) : !chargeable ? (
        <FormAlert>Solo se cobran citas confirmadas, en atención o completadas.</FormAlert>
      ) : (
        <SaleForm
          action={chargeAppointmentAction.bind(null, appt.id)}
          idempotencyKey={crypto.randomUUID()}
          products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, stock: p.trackStock ? p.stock : null }))}
          benefit={{ threshold: shop.pointsForBenefit, percent: shop.benefitPercent }}
          branches={branches} defaultBranchId={appt.branchId}
          fixed={{ serviceName: appt.service.name, priceCents: appt.priceCents, customerName: appt.customer.fullName, points: ledger._sum.delta ?? 0 }}
        />
      )}
    </>
  );
}
