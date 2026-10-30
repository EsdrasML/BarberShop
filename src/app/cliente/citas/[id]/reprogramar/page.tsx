import Link from "next/link";
import { notFound } from "next/navigation";
import { rescheduleOwnAction } from "@/actions/booking";
import { RescheduleForm } from "@/components/booking/reschedule-form";
import { formatDay, formatTimeRange } from "@/lib/appointments-ui";
import { MAX_DAYS_AHEAD } from "@/lib/booking";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs } from "@/lib/tz";

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CLIENT");
  const { id } = await params;
  const [shop, a] = await Promise.all([
    getShop(),
    db.appointment.findFirst({
      where: { id, customer: { userId: user.id }, status: { in: ["PENDING", "CONFIRMED"] } },
      include: { service: { select: { name: true } }, barber: { select: { displayName: true } } },
    }),
  ]);
  if (!a) notFound();

  const now = new Date();
  return (
    <div>
      <Link href="/cliente/citas" className="text-sm text-steel hover:text-gold-text">← Mis citas</Link>
      <h1 className="sub-section mb-3 mt-3">Reprogramar cita</h1>
      <p className="mb-8 text-steel">
        Actual: <span className="capitalize text-white">{formatDay(a.startsAt, shop.timezone)}</span>, {formatTimeRange(a.startsAt, a.endsAt, shop.timezone)} · {a.service.name} con {a.barber.displayName}.
      </p>
      <RescheduleForm
        action={rescheduleOwnAction.bind(null, id)}
        appointmentId={a.id} serviceId={a.serviceId} barberId={a.barberId}
        minDate={utcToLocalInputs(now, shop.timezone).date}
        maxDate={utcToLocalInputs(new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000), shop.timezone).date}
        tz={shop.timezone}
      />
    </div>
  );
}
