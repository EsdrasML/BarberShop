import Link from "next/link";
import { cancelAbsenceAction, createAbsenceAction } from "@/actions/admin/barbers";
import { AbsenceForm, emptyAbsence } from "@/components/admin/absence-form";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

const typeLabel = { VACATION: "Vacaciones", PERMISSION: "Permiso", SICK: "Enfermedad", OTHER: "Otro" } as const;

export default async function AbsencesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const shop = await getShop();
  const absences = await db.absence.findMany({ where: { barberId: id }, orderBy: { startsAt: "desc" }, take: 50 });

  const day = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeZone: shop.timezone });
  const time = new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", timeZone: shop.timezone });
  const range = (a: (typeof absences)[number]) =>
    a.allDay
      ? (() => {
          const last = new Date(a.endsAt.getTime() - 60_000); // fin exclusivo → último día incluido
          return day.format(a.startsAt) === day.format(last) ? day.format(a.startsAt) : `${day.format(a.startsAt)} – ${day.format(last)}`;
        })()
      : `${day.format(a.startsAt)} · ${time.format(a.startsAt)} – ${time.format(a.endsAt)}`;

  // Citas activas que coinciden con cada ausencia vigente (se avisan, nunca se cancelan solas).
  const affected = new Map<string, number>();
  for (const a of absences.filter((x) => x.status === "ACTIVE")) {
    affected.set(a.id, await db.appointment.count({
      where: { barberId: id, status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] }, startsAt: { lt: a.endsAt }, endsAt: { gt: a.startsAt } },
    }));
  }

  return (
    <div className="flex flex-col gap-10">
      <Card tone="iron" className="max-w-2xl">
        <h2 className="feature-heading mb-2">Registrar ausencia</h2>
        <p className="mb-6 text-sm text-steel">Durante una ausencia el barbero no aparece disponible para nuevas citas. Su perfil, historial y estadísticas no cambian.</p>
        <AbsenceForm action={createAbsenceAction.bind(null, id)} initial={emptyAbsence} />
      </Card>

      <section>
        <h2 className="feature-heading mb-4">Ausencias registradas</h2>
        {absences.length === 0 ? (
          <EmptyState>Este barbero no tiene ausencias registradas.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {absences.map((a) => {
              const n = affected.get(a.id) ?? 0;
              return (
                <li key={a.id}>
                  <Card tone="iron" className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-5">
                    <div>
                      <p>{range(a)}</p>
                      <p className="text-sm text-steel">{typeLabel[a.type]}{a.reason ? ` · ${a.reason}` : ""}</p>
                      {n > 0 && <p className="mt-1 text-sm text-danger">{n} cita(s) reservadas coinciden con este periodo.</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={a.status === "ACTIVE" ? "info" : "danger"}>{a.status === "ACTIVE" ? "Vigente" : "Cancelada"}</Badge>
                      {a.status === "ACTIVE" && (
                        <>
                          <Link href={`/admin/barberos/${id}/ausencias/${a.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link>
                          <ConfirmForm action={cancelAbsenceAction.bind(null, id, a.id)} message="¿Cancelar esta ausencia? El barbero volverá a estar disponible en ese periodo.">
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
        )}
      </section>
    </div>
  );
}
