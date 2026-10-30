import { ManualBookingForm } from "@/components/booking/manual-booking-form";
import { PageHeader } from "@/components/admin/ui";
import { ADMIN_MAX_DAYS } from "@/lib/booking";
import { getActiveBranches } from "@/lib/branches";
import { db } from "@/lib/db";
import { barbersWhere, isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getPublicServices, getShop } from "@/lib/shop";
import { utcToLocalInputs } from "@/lib/tz";

export default async function NewAppointmentPage() {
  const user = await requireRole("ADMIN");
  const [shop, services, barbers, branches] = await Promise.all([
    getShop(),
    getPublicServices(),
    db.barber.findMany({ where: { isActive: true, deletedAt: null, workingHours: { some: {} }, ...barbersWhere(user) }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true, branches: { select: { id: true } } } }),
    getActiveBranches(),
  ]);
  const now = new Date();
  return (
    <>
      <PageHeader title="Nueva cita" subtitle="Para un cliente que reserva en el local. Aplica las mismas reglas de disponibilidad que la reserva en línea." />
      <ManualBookingForm
        services={services.map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents, durationMinutes: s.durationMinutes }))}
        barbers={barbers.map((b) => ({ id: b.id, displayName: b.displayName, branchIds: b.branches.map((x) => x.id) }))}
        branches={isBranchScoped(user) ? branches.filter((b) => b.id === user.branchId) : branches}
        minDate={utcToLocalInputs(now, shop.timezone).date}
        maxDate={utcToLocalInputs(new Date(now.getTime() + ADMIN_MAX_DAYS * 86_400_000), shop.timezone).date}
        tz={shop.timezone}
      />
    </>
  );
}
