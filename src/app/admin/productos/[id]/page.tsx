import { notFound } from "next/navigation";
import { adjustStockAction, updateProductAction } from "@/actions/admin/products";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { StockForm } from "@/components/admin/stock-form";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/appointments-ui";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

const reasonLabel = { PURCHASE: "Compra", SALE: "Venta", ADJUSTMENT: "Ajuste", RETURN: "Devolución" } as const;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const [p, shop] = await Promise.all([db.product.findFirst({ where: { id, deletedAt: null } }), getShop()]);
  if (!p) notFound();
  const movements = await db.stockMovement.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <>
      <PageHeader title="Editar producto" />
      <div className="grid gap-10 xl:grid-cols-[1.3fr_1fr]">
        <ProductForm
          isNew={false}
          action={updateProductAction.bind(null, id)}
          initial={{
            name: p.name, description: p.description ?? "", price: (p.priceCents / 100).toFixed(2), imageUrl: p.imageUrl ?? "",
            trackStock: p.trackStock, initialStock: "0", lowStockAt: String(p.lowStockAt), isActive: p.isActive,
          }}
        />
        <Card tone="iron" className="self-start">
          <h2 className="feature-heading">Inventario</h2>
          {p.trackStock ? (
            <>
              <p className="mt-2 text-steel">Existencias actuales: <span className="text-white">{p.stock}</span></p>
              <div className="mt-6"><StockForm action={adjustStockAction.bind(null, id)} /></div>
              <h3 className="label-micro mb-3 mt-8 text-steel">Últimos movimientos</h3>
              {movements.length === 0 ? (
                <p className="text-sm text-steel">Sin movimientos todavía.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {movements.map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 border-t border-graphite pt-2">
                      <span>{reasonLabel[m.reason]}{m.note ? ` · ${m.note}` : ""} <span className="text-steel">({formatShortDate(m.createdAt, shop.timezone)})</span></span>
                      <span className={m.delta > 0 ? "text-gold-text" : "text-steel"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-steel">Activa «Controlar inventario» en el formulario para registrar existencias y movimientos.</p>
          )}
        </Card>
      </div>
    </>
  );
}
