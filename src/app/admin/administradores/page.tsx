import Link from "next/link";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { FormAlert } from "@/components/auth/form-parts";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { isPlatformOwner } from "@/lib/owner";
import { requireOwner } from "@/lib/session";

export default async function AdminsPage({ searchParams }: { searchParams: Promise<{ invitado?: string }> }) {
  const sp = await searchParams;
  const me = await requireOwner();
  const admins = await db.user.findMany({
    where: { role: "ADMIN" }, orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, isActive: true, passwordHash: true, branch: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Administradores" subtitle="Solo visible para el propietario. Cada sucursal tiene el suyo: ve y cobra únicamente lo de su sucursal.">
        <Link href="/admin/administradores/nuevo" className={buttonClasses({ variant: "accent", size: "sm" })}>Nuevo administrador</Link>
      </PageHeader>
      {sp.invitado && <div className="mb-6"><FormAlert tone="success">Administrador creado e invitación enviada por correo.</FormAlert></div>}
      {admins.length === 0 ? <EmptyState>No hay administradores.</EmptyState> : (
        <TableWrap>
          <thead><tr><th className={th}>Administrador</th><th className={th}>Sucursal</th><th className={th}>Acceso</th><th className={th}><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {admins.map((a) => {
              const owner = isPlatformOwner({ role: "ADMIN", email: a.email });
              return (
                <tr key={a.id} className={rowClass}>
                  <td className={td}><p>{a.name}{a.id === me.id ? " (tú)" : ""}</p><p className="text-steel">{a.email}</p></td>
                  <td className={td}>{a.branch?.name ?? <span className="text-steel">Todas</span>}</td>
                  <td className={td}>
                    {owner ? <Badge tone="done">Propietario</Badge> : !a.isActive ? <Badge>Inactivo</Badge> : a.passwordHash ? <Badge tone="info">Con acceso</Badge> : <Badge tone="pending">Invitación pendiente</Badge>}
                  </td>
                  <td className={td}>
                    <div className="flex justify-end">
                      {!owner && a.id !== me.id && <Link href={`/admin/administradores/${a.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
