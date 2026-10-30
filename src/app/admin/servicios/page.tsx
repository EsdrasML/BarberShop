import Link from "next/link";
import { deleteServiceAction, toggleServiceAction } from "@/actions/admin/services";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireOwner } from "@/lib/session";

export default async function ServicesPage() {
  await requireOwner();
  const services = await db.service.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return (
    <>
      <PageHeader title="Servicios" subtitle={`${services.length} ${services.length === 1 ? "servicio" : "servicios"}`}>
        <Link href="/admin/servicios/nuevo" className={buttonClasses({ variant: "accent", size: "sm" })}>Nuevo servicio</Link>
      </PageHeader>
      {services.length === 0 ? (
        <EmptyState>Aún no hay servicios. Crea el primero para que aparezca en la página pública.</EmptyState>
      ) : (
        <TableWrap>
          <thead>
            <tr><th className={th}>Servicio</th><th className={th}>Duración</th><th className={th}>Precio</th><th className={th}>Estado</th><th className={th}><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className={rowClass}>
                <td className={td}>{s.name}</td>
                <td className={td}>{s.durationMinutes} min</td>
                <td className={td}>{formatMoney(s.priceCents)}</td>
                <td className={td}><Badge tone={s.isActive ? "info" : "neutral"}>{s.isActive ? "Activo" : "Inactivo"}</Badge></td>
                <td className={td}>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/servicios/${s.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link>
                    <form action={toggleServiceAction.bind(null, s.id)}>
                      <Button type="submit" variant="ghost" size="sm">{s.isActive ? "Desactivar" : "Activar"}</Button>
                    </form>
                    <ConfirmForm action={deleteServiceAction.bind(null, s.id)} message={`¿Eliminar "${s.name}"? Las citas y ventas anteriores se conservan.`}>
                      <Button type="submit" variant="ghost" size="sm" className="text-danger">Eliminar</Button>
                    </ConfirmForm>
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
