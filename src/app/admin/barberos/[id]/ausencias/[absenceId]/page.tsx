import { notFound } from "next/navigation";
import { updateAbsenceAction } from "@/actions/admin/barbers";
import { AbsenceForm } from "@/components/admin/absence-form";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs } from "@/lib/tz";

export default async function EditAbsencePage({ params }: { params: Promise<{ id: string; absenceId: string }> }) {
  await requireRole("ADMIN");
  const { id, absenceId } = await params;
  const [a, shop] = await Promise.all([db.absence.findFirst({ where: { id: absenceId, barberId: id, status: "ACTIVE" } }), getShop()]);
  if (!a) notFound();

  const start = utcToLocalInputs(a.startsAt, shop.timezone);
  const end = utcToLocalInputs(new Date(a.endsAt.getTime() - 60_000), shop.timezone); // último día incluido
  const endTime = utcToLocalInputs(a.endsAt, shop.timezone).time;
  return (
    <AbsenceForm
      action={updateAbsenceAction.bind(null, id, absenceId)}
      backHref={`/admin/barberos/${id}/ausencias`}
      initial={{
        type: a.type, allDay: a.allDay, startDate: start.date, endDate: a.allDay && end.date !== start.date ? end.date : "",
        startTime: a.allDay ? "" : start.time, endTime: a.allDay ? "" : endTime, reason: a.reason ?? "",
      }}
    />
  );
}
