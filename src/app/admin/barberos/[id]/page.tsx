import { notFound } from "next/navigation";
import { updateBarberAction } from "@/actions/admin/barbers";
import { BarberForm } from "@/components/admin/barber-form";
import { GoogleCalendarCard } from "@/components/admin/google-calendar-card";
import { getActiveBranches } from "@/lib/branches";
import { db } from "@/lib/db";
import { calendarConfigured } from "@/lib/google-calendar";
import { isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

export default async function EditBarberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gcal?: string }> }) {
  const user = await requireRole("ADMIN");
  const [{ id }, sp, shop] = await Promise.all([params, searchParams, getShop()]);
  const b = await db.barber.findFirst({ where: { id, deletedAt: null }, include: { branches: { select: { id: true } }, googleConnection: true } });
  const branches = isBranchScoped(user) ? [] : await getActiveBranches();
  if (!b) notFound();
  const c = b.googleConnection;
  const when = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: shop.timezone });

  return (
    <div className="flex flex-col gap-10">
      <BarberForm
        action={updateBarberAction.bind(null, id)}
        branches={branches}
        initial={{
          branchIds: b.branches.map((x) => x.id),
          displayName: b.displayName, bio: b.bio ?? "", phone: b.phone ?? "", email: b.email ?? "", photoUrl: b.photoUrl ?? "",
          isActive: b.isActive, canRegisterPayments: b.canRegisterPayments, canViewRevenue: b.canViewRevenue,
        }}
      />
      <GoogleCalendarCard
        barberId={id} configured={calendarConfigured()} notice={sp.gcal}
        connection={c ? { status: c.status, googleEmail: c.googleEmail, lastError: c.lastError } : null}
        lastSync={c?.lastSyncAt ? when.format(c.lastSyncAt) : undefined}
      />
    </div>
  );
}
