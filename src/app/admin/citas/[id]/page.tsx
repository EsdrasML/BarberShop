import Link from "next/link";
import { notFound } from "next/navigation";
import { adminCancelAction, adminRescheduleAction, adminStatusAction } from "@/actions/admin/appointments";
import { retrySyncAction } from "@/actions/admin/calendar";
import { PageHeader } from "@/components/admin/ui";
import { FormAlert } from "@/components/auth/form-parts";
import { CancelForm } from "@/components/booking/cancel-form";
import { RescheduleForm } from "@/components/booking/reschedule-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { nextStatuses, startedEnough, type Status } from "@/lib/appointment-status";
import { formatDay, formatTimeRange, statusLabel, statusTone } from "@/lib/appointments-ui";
import { ADMIN_MAX_DAYS } from "@/lib/booking";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { assertAppointmentAccess, barbersWhere } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";
import { utcToLocalInputs } from "@/lib/tz";

const oks: Record<string, string> = { sync: "Sincronizada con Google Calendar.", creada: "Cita registrada.", reprogramada: "Cita reprogramada.", estado: "Estado actualizado.", cancelada: "Cita cancelada." };

export default async function AppointmentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireRole("ADMIN");
  const [{ id }, sp, shop] = await Promise.all([params, searchParams, getShop()]);
  await assertAppointmentAccess(user, id);
  const a = await db.appointment.findUnique({
    where: { id },
    include: {
      customer: true, calendarEvent: true, branch: { select: { name: true } }, barber: { select: { displayName: true, googleConnection: { select: { status: true } } } }, service: { select: { name: true } },
      history: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
    },
  });
  if (!a) notFound();

  const tz = shop.timezone;
  const status = a.status as Status;
  const actions = nextStatuses(status).filter((s) => s !== "CANCELLED");
  const canMove = status === "PENDING" || status === "CONFIRMED";
  const canCancel = nextStatuses(status).includes("CANCELLED");
  const started = startedEnough("COMPLETED", a.startsAt, new Date());
  const barbers = canMove ? await db.barber.findMany({ where: { isActive: true, deletedAt: null, workingHours: { some: {} }, ...barbersWhere(user) }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }) : [];
  const sale = await db.sale.findFirst({ where: { appointmentId: id, status: { not: "VOID" } }, select: { id: true, status: true, totalCents: true } });
  const chargeable = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(status);
  const now = new Date();
  const when = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: tz });

  return (
    <>
      <Link href="/admin/citas" className="text-sm text-steel hover:text-gold-text">← Citas</Link>
      <div className="mt-3"><PageHeader title={a.customer.fullName} subtitle={`${a.customer.email ?? "Sin correo"} · ${a.customer.phone || "Sin teléfono"}`}><Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge></PageHeader></div>

      {sp.ok && oks[sp.ok] && <div className="mb-6"><FormAlert tone="success">{oks[sp.ok]}</FormAlert></div>}
      {sp.error && <div className="mb-6"><FormAlert>{sp.error}</FormAlert></div>}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-8">
          <Card tone="iron">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="label-micro text-steel">Cuándo</dt><dd className="capitalize">{formatDay(a.startsAt, tz)}<br />{formatTimeRange(a.startsAt, a.endsAt, tz)}</dd></div>
              {a.branch && <div><dt className="label-micro text-steel">Sucursal</dt><dd>{a.branch.name}</dd></div>}
              <div><dt className="label-micro text-steel">Barbero</dt><dd>{a.barber.displayName}</dd></div>
              <div><dt className="label-micro text-steel">Servicio</dt><dd>{a.service.name} · {a.durationMinutes} min</dd></div>
              <div><dt className="label-micro text-steel">Precio acordado</dt><dd className="text-gold-text">{formatMoney(a.priceCents)}</dd></div>
              <div><dt className="label-micro text-steel">Origen</dt><dd>{a.source === "ONLINE" ? "Reserva en línea" : a.source === "ADMIN" ? "Registrada por el administrador" : "Registrada por el barbero"}</dd></div>
              {a.notes && <div className="sm:col-span-2"><dt className="label-micro text-steel">Notas</dt><dd>{a.notes}</dd></div>}
              {a.cancelReason && <div className="sm:col-span-2"><dt className="label-micro text-steel">Motivo de cancelación</dt><dd>{a.cancelReason}</dd></div>}
            </dl>
          </Card>

          {a.barber.googleConnection && a.barber.googleConnection.status !== "DISCONNECTED" && (
            <Card tone="iron">
              <h2 className="feature-heading mb-3">Google Calendar</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={a.calendarEvent?.syncStatus === "SYNCED" ? "done" : a.calendarEvent?.syncStatus === "FAILED" ? "danger" : "pending"}>
                  {a.calendarEvent?.syncStatus === "SYNCED" ? "Sincronizada" : a.calendarEvent?.syncStatus === "FAILED" ? "Con error" : a.calendarEvent?.syncStatus === "DELETED" ? "Eliminada del calendario" : "Pendiente"}
                </Badge>
                {a.calendarEvent?.lastError && <span className="text-sm text-danger">{a.calendarEvent.lastError}</span>}
                <form action={retrySyncAction.bind(null, id)}><Button type="submit" variant="ghost" size="sm">Reintentar sincronización</Button></form>
              </div>
            </Card>
          )}

          {sale && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Cobro</h2>
              {sale ? (
                <div className="flex flex-wrap items-center gap-4">
                  <Badge tone={sale.status === "PAID" ? "done" : "pending"}>{sale.status === "PAID" ? "Cobrada" : "Pendiente de cobro"}</Badge>
                  <span>{formatMoney(sale.totalCents)}</span>
                  <Link href={`/admin/ventas/${sale.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Ver venta</Link>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-steel">Registra el pago, suma productos y aplica el beneficio de puntos si el cliente lo tiene.</p>
                  <Link href={`/admin/ventas/nueva?cita=${a.id}`} className={buttonClasses({ variant: "accent", size: "sm" })}>Cobrar</Link>
                </div>
              )}
            </Card>
          )}

          {(status === "CONFIRMED" || status === "IN_PROGRESS") && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Atención</h2>
              <div className="flex flex-wrap items-center gap-3">
                {status === "IN_PROGRESS" ? (
                  <Badge tone="info">En proceso</Badge>
                ) : (
                  <form action={adminStatusAction.bind(null, id, "IN_PROGRESS")}>
                    <Button type="submit" variant="ghost" size="sm" disabled={!started}>En proceso</Button>
                  </form>
                )}
                {started ? (
                  <Link href={`/admin/ventas/nueva?cita=${a.id}`} className={buttonClasses({ variant: "accent", size: "sm" })}>Completar y cobrar</Link>
                ) : (
                  <Button variant="accent" size="sm" disabled>Completar y cobrar</Button>
                )}
              </div>
              <p className="mt-4 text-sm text-steel">
                {started
                  ? "«Completar» lleva al cobro: la cita se marca como completada al registrar el pago. Ahí también puedes sumar productos a la venta."
                  : "Podrás iniciar la atención o completar la cita desde 15 minutos antes de su hora."}
              </p>
            </Card>
          )}

          {canMove && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Reprogramar</h2>
              <RescheduleForm
                action={adminRescheduleAction.bind(null, id)}
                appointmentId={a.id} serviceId={a.serviceId} barberId={a.barberId} barbers={barbers}
                minDate={utcToLocalInputs(now, tz).date}
                maxDate={utcToLocalInputs(new Date(now.getTime() + ADMIN_MAX_DAYS * 86_400_000), tz).date}
                tz={tz}
              />
            </Card>
          )}

          {canCancel && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Cancelar</h2>
              <CancelForm action={adminCancelAction.bind(null, id)} />
            </Card>
          )}
        </div>

        <Card tone="iron" className="self-start">
          <h2 className="feature-heading mb-4">Historial</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {a.history.map((h) => (
              <li key={h.id} className="border-t border-graphite pt-3 first:border-0 first:pt-0">
                <p>{statusLabel[h.toStatus]}{h.note ? ` · ${h.note}` : ""}</p>
                <p className="text-steel">{when.format(h.createdAt)}{h.changedBy ? ` · ${h.changedBy.name}` : ""}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
