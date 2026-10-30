import Link from "next/link";
import { toggleBarberAction } from "@/actions/admin/barbers";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { barbersWhere } from "@/lib/scope";
import { requireRole } from "@/lib/session";

const googleLabel = { CONNECTED: "Conectado", NEEDS_REAUTH: "Reautorizar", ERROR: "Con error", DISCONNECTED: "Sin conectar" } as const;

export default async function BarbersPage() {
  const user = await requireRole("ADMIN");
  const barbers = await db.barber.findMany({
    where: { deletedAt: null, ...barbersWhere(user) },
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
    include: { googleConnection: { select: { status: true } }, _count: { select: { workingHours: true } } },
  });

  return (
    <>
      <PageHeader title="Barberos" subtitle={`${barbers.filter((b) => b.isActive).length} activos de ${barbers.length}`}>
        <Link href="/admin/barberos/nuevo" className={buttonClasses({ variant: "accent", size: "sm" })}>Nuevo barbero</Link>
      </PageHeader>
      {barbers.length === 0 ? (
        <EmptyState>Aún no hay barberos. Crea el primero para poder recibir citas.</EmptyState>
      ) : (
        <TableWrap>
          <thead>
            <tr><th className={th}>Barbero</th><th className={th}>Estado</th><th className={th}>Atiende</th><th className={th}>Google Calendar</th><th className={th}><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {barbers.map((b) => (
              <tr key={b.id} className={rowClass}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {b.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.photoUrl} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-full bg-gold/15 text-gold-text" aria-hidden="true">{b.displayName.charAt(0).toUpperCase()}</span>
                    )}
                    <div>
                      <p>{b.displayName}</p>
                      {b.phone && <p className="text-steel">{b.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className={td}><Badge tone={b.isActive ? "info" : "neutral"}>{b.isActive ? "Activo" : "Inactivo"}</Badge></td>
                <td className={td}>
                  {b._count.workingHours > 0 ? <Badge tone="info">Con cita</Badge> : <Badge>Solo walk-in</Badge>}
                </td>
                <td className={td}><span className="text-steel">{googleLabel[b.googleConnection?.status ?? "DISCONNECTED"]}</span></td>
                <td className={td}>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/barberos/${b.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link>
                    <Link href={`/admin/barberos/${b.id}/horario`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Horario</Link>
                    <form action={toggleBarberAction.bind(null, b.id)}>
                      <Button type="submit" variant="ghost" size="sm">{b.isActive ? "Desactivar" : "Activar"}</Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
