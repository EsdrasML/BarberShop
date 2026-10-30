import Link from "next/link";
import { deleteProductAction, toggleProductAction } from "@/actions/admin/products";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { EmptyState, PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/session";

export default async function ProductsPage() {
  await requireRole("ADMIN");
  const products = await db.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Productos" subtitle={`${products.length} ${products.length === 1 ? "producto" : "productos"}`}>
        <Link href="/admin/productos/nuevo" className={buttonClasses({ variant: "accent", size: "sm" })}>Nuevo producto</Link>
      </PageHeader>
      {products.length === 0 ? (
        <EmptyState>Aún no hay productos. Los que actives aparecerán en la sección Productos de la página pública.</EmptyState>
      ) : (
        <TableWrap>
          <thead>
            <tr><th className={th}>Producto</th><th className={th}>Precio</th><th className={th}>Existencias</th><th className={th}>Estado</th><th className={th}><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.trackStock && p.stock <= p.lowStockAt;
              return (
                <tr key={p.id} className={rowClass}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="size-10 rounded-lg object-cover" />
                      )}
                      {p.name}
                    </div>
                  </td>
                  <td className={td}>{formatMoney(p.priceCents)}</td>
                  <td className={td}>
                    {p.trackStock ? (<>{p.stock} {low && <Badge tone="pending" className="ml-2">Bajas</Badge>}</>) : <span className="text-steel">Sin control</span>}
                  </td>
                  <td className={td}><Badge tone={p.isActive ? "info" : "neutral"}>{p.isActive ? "Activo" : "Inactivo"}</Badge></td>
                  <td className={td}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/productos/${p.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>Editar</Link>
                      <form action={toggleProductAction.bind(null, p.id)}>
                        <Button type="submit" variant="ghost" size="sm">{p.isActive ? "Desactivar" : "Activar"}</Button>
                      </form>
                      <ConfirmForm action={deleteProductAction.bind(null, p.id)} message={`¿Eliminar "${p.name}"? Su historial se conserva.`}>
                        <Button type="submit" variant="ghost" size="sm" className="text-danger">Eliminar</Button>
                      </ConfirmForm>
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
