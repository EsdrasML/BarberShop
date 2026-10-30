import Link from "next/link";
import { cancelOwnAction } from "@/actions/booking";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { FormAlert } from "@/components/auth/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OPEN } from "@/lib/appointment-status";
import { formatDay, formatTimeRange, statusLabel, statusTone } from "@/lib/appointments-ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

const avisos: Record<string, { tone: "success" | "error"; text: string }> = {
  reservada: { tone: "success", text: "¡Reserva confirmada! Te esperamos." },
  reprogramada: { tone: "success", text: "Tu cita se reprogramó correctamente." },
  cancelada: { tone: "success", text: "Tu cita fue cancelada." },
  "fuera-de-plazo": { tone: "error", text: "Ya no puedes cambiar esta cita por tu cuenta. Comunícate con la barbería." },
  "no-cancelable": { tone: "error", text: "Esta cita ya no se puede cancelar." },
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const user = await requireRole("CLIENT");
  const [{ aviso }, shop] = await Promise.all([searchParams, getShop()]);
  const customer = await db.customer.findUnique({ where: { userId: user.id }, select: { id: true } });
  // Solo las citas del cliente autenticado: el filtro viene de la sesión, no de la URL.
  const appointments = customer
    ? await db.appointment.findMany({
        where: { customerId: customer.id },
        orderBy: { startsAt: "desc" },
        take: 100,
        include: { service: { select: { name: true } }, barber: { select: { displayName: true } } },
      })
    : [];
  const now = Date.now();
  const notice = aviso ? avisos[aviso] : undefined;

  return (
    <div>
      <h1 className="sub-section mb-8">Mis citas</h1>
      {notice && <div className="mb-6"><FormAlert tone={notice.tone}>{notice.text}</FormAlert></div>}
      {appointments.length === 0 ? (
        <Card tone="iron" className="flex flex-col items-start gap-5">
          <p className="text-steel">Aún no tienes citas. Cuando reserves una, aparecerá aquí con su estado.</p>
          <Link href="/agendar" className={buttonClasses({ variant: "accent" })}>Agendar cita</Link>
        </Card>
      ) : (
        <>
          <Link href="/agendar" className={`${buttonClasses({ variant: "accent", size: "sm" })} mb-6`}>Agendar otra cita</Link>
          <ul className="flex flex-col gap-3">
            {appointments.map((a) => {
              const open = (OPEN as string[]).includes(a.status) && a.status !== "IN_PROGRESS";
              const canChange = open && now <= a.startsAt.getTime() - shop.cancellationMinutes * 60_000;
              return (
                <li key={a.id}>
                  <Card tone="iron" className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
                    <div>
                      <p className="capitalize">{formatDay(a.startsAt, shop.timezone)}</p>
                      <p className="text-sm text-steel">{formatTimeRange(a.startsAt, a.endsAt, shop.timezone)} · {a.service.name} · {a.barber.displayName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span>{formatMoney(a.priceCents)}</span>
                      <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                      {canChange && (
                        <>
                          <Link href={`/cliente/citas/${a.id}/reprogramar`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Reprogramar</Link>
                          <ConfirmForm action={cancelOwnAction.bind(null, a.id)} message="¿Cancelar esta cita?">
                            <Button type="submit" variant="ghost" size="sm" className="text-danger">Cancelar</Button>
                          </ConfirmForm>
                        </>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-steel">Puedes reprogramar o cancelar hasta {shop.cancellationMinutes / 60} h antes de la cita.</p>
        </>
      )}
    </div>
  );
}
