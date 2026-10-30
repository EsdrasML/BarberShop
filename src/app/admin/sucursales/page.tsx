import Link from "next/link";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export default async function BranchesPage() {
  await requireOwner();
  const branches = await db.branch.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Sucursales" subtitle="Solo visible para el propietario de la plataforma. Los puntos de los clientes valen en todas; las ventas se llevan por sucursal.">
        <Link href="/admin/sucursales/nueva" className={buttonClasses({ variant: "accent", size: "sm" })}>Nueva sucursal</Link>
      </PageHeader>
      {branches.length === 0 ? (
        <EmptyState>No hay sucursales: el negocio funciona sin ellas. Crea una para llevar las ventas por local.</EmptyState>
      ) : (
        <TableWrap>
          <thead><tr><th className={th}>Sucursal</th><th className={th}>Dirección</th><th className={th}>Estado</th><th className={th}><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className={rowClass}>
                <td className={td}>{b.name}</td>
                <td className={`${td} text-steel`}>{b.address ?? "—"}</td>
                <td className={td}><Badge tone={b.isActive ? "info" : "neutral"}>{b.isActive ? "Activa" : "Inactiva"}</Badge></td>
                <td className={td}><div className="flex justify-end"><Link href={`/admin/sucursales/${b.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link></div></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
