import Link from "next/link";
import { notFound } from "next/navigation";
import { payPendingAction, voidSaleAction } from "@/actions/admin/sales";
import { PageHeader, TableWrap, rowClass, td, th } from "@/components/admin/ui";
import { FormAlert } from "@/components/auth/form-parts";
import { PayForm } from "@/components/sales/pay-form";
import { VoidForm } from "@/components/sales/void-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { assertSaleAccess } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

const statusLabel = { PENDING: "Pendiente de cobro", PAID: "Cobrada", VOID: "Anulada" } as const;
const statusTone = { PENDING: "pending", PAID: "done", VOID: "danger" } as const;

export default async function SaleDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const user = await requireRole("ADMIN");
  const [{ id }, sp, shop] = await Promise.all([params, searchParams, getShop()]);
  await assertSaleAccess(user, id);
  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      items: true, payments: { orderBy: { createdAt: "asc" }, include: { recordedBy: { select: { name: true } } } },
      customer: { select: { id: true, fullName: true, userId: true } }, barber: { select: { displayName: true } },
      benefit: true, createdBy: { select: { name: true } },
    },
  });
  if (!sale) notFound();

  const serviceItem = sale.items.find((i) => i.type === "SERVICE");
  const productsCents = sale.items.filter((i) => i.type === "PRODUCT").reduce((n, i) => n + i.totalCents, 0);
  const points = sale.customerId ? await getPointsBalanceByCustomer(sale.customerId) : 0;
  const when = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: shop.timezone });

  return (
    <>
      <Link href="/admin/ventas" className="text-sm text-steel hover:text-gold-text">← Ventas</Link>
      <div className="mt-3">
        <PageHeader title="Venta" subtitle={`${sale.customer?.fullName ?? "Visita"}${sale.barber ? ` · ${sale.barber.displayName}` : ""} · ${when.format(sale.createdAt)}`}>
          <Badge tone={statusTone[sale.status]}>{statusLabel[sale.status]}</Badge>
        </PageHeader>
      </div>
      {sp.ok && <div className="mb-6"><FormAlert tone="success">Operación registrada.</FormAlert></div>}

      <div className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-8">
          <TableWrap>
            <thead><tr><th className={th}>Concepto</th><th className={th}>Cant.</th><th className={th}>Precio</th><th className={th}>Total</th></tr></thead>
            <tbody>
              {sale.items.map((i) => (
                <tr key={i.id} className={rowClass}>
                  <td className={td}>{i.description} <span className="text-xs text-steel">{i.type === "SERVICE" ? "Servicio" : "Producto"}</span></td>
                  <td className={td}>{i.quantity}</td><td className={td}>{formatMoney(i.unitPriceCents)}</td><td className={td}>{formatMoney(i.totalCents)}</td>
                </tr>
              ))}
              <tr className={rowClass}><td className={td} colSpan={3}>Subtotal</td><td className={td}>{formatMoney(sale.subtotalCents)}</td></tr>
              {sale.discountCents > 0 && <tr className={rowClass}><td className={`${td} text-gold-text`} colSpan={3}>Descuento por puntos{sale.benefit ? ` (${sale.benefit.percent}%)` : ""}</td><td className={`${td} text-gold-text`}>− {formatMoney(sale.discountCents)}</td></tr>}
              <tr className={rowClass}><td className={`${td} text-lg`} colSpan={3}>Total</td><td className={`${td} text-lg`}>{formatMoney(sale.totalCents)}</td></tr>
            </tbody>
          </TableWrap>

          {sale.payments.length > 0 && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Pagos</h2>
              <ul className="flex flex-col gap-3 text-sm">
                {sale.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-graphite pt-3 first:border-0 first:pt-0">
                    <span>
                      Pago registrado
                      <span className="block text-steel">{when.format(p.paidAt)}{p.recordedBy ? ` · ${p.recordedBy.name}` : ""}</span>
                      {p.status === "VOIDED" && <span className="block text-danger">Anulado{p.voidReason ? `: ${p.voidReason}` : ""}</span>}
                    </span>
                    <span className={p.status === "VOIDED" ? "text-steel line-through" : ""}>{formatMoney(p.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {sale.status === "VOID" && <FormAlert>Venta anulada{sale.voidReason ? `: ${sale.voidReason}` : ""}. Se conserva en el historial y no suma en los reportes.</FormAlert>}
        </div>

        <div className="flex flex-col gap-8">
          {sale.status === "PENDING" && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Registrar pago</h2>
              <PayForm
                action={payPendingAction.bind(null, id)} idempotencyKey={crypto.randomUUID()}
                serviceCents={serviceItem ? serviceItem.totalCents : null} productsCents={productsCents}
                points={points} hasCustomer={!!sale.customerId} benefit={{ threshold: shop.pointsForBenefit, percent: shop.benefitPercent }}
              />
            </Card>
          )}
          {sale.status !== "VOID" && (
            <Card tone="iron">
              <h2 className="feature-heading mb-4">Anular venta</h2>
              <VoidForm action={voidSaleAction.bind(null, id)} paid={sale.status === "PAID"} />
            </Card>
          )}
          {sale.appointmentId && (
            <Link href={`/admin/citas/${sale.appointmentId}`} className="text-sm text-steel hover:text-gold-text">Ver la cita de esta venta →</Link>
          )}
        </div>
      </div>
    </>
  );
}

async function getPointsBalanceByCustomer(customerId: string) {
  const r = await db.pointsLedger.aggregate({ where: { customerId }, _sum: { delta: true } });
  return r._sum.delta ?? 0;
}
