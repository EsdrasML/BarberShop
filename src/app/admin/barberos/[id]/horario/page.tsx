import { saveScheduleAction } from "@/actions/admin/barbers";
import { ScheduleForm } from "@/components/admin/schedule-form";
import { db } from "@/lib/db";
import { WEEK, minutesToTime } from "@/lib/schedule";
import { requireRole } from "@/lib/session";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const hours = await db.workingHours.findMany({ where: { barberId: id }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] });

  const initial: Record<string, string> = {};
  for (const { weekday } of WEEK) {
    hours.filter((h) => h.weekday === weekday).slice(0, 2).forEach((h, i) => {
      const slot = i === 0 ? "a" : "b";
      initial[`${weekday}_${slot}_start`] = minutesToTime(h.startMinute);
      initial[`${weekday}_${slot}_end`] = minutesToTime(h.endMinute);
    });
  }
  return <ScheduleForm action={saveScheduleAction.bind(null, id)} initial={initial} />;
}
