import { walkInSaleAction } from "@/actions/admin/sales";
import { PageHeader } from "@/components/admin/ui";
import { SaleForm } from "@/components/sales/sale-form";
import { getActiveBranches } from "@/lib/branches";
import { db } from "@/lib/db";
import { barbersWhere, isBranchScoped } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { getPublicServices, getShop } from "@/lib/shop";

export default async function WalkInPage() {
  const user = await requireRole("ADMIN");
  const [shop, services, barbers, products, allBranches] = await Promise.all([
    getShop(),
    getPublicServices(),
    db.barber.findMany({ where: { isActive: true, deletedAt: null, ...barbersWhere(user) }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    db.product.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }),
    getActiveBranches(),
  ]);
  const branches = isBranchScoped(user) ? allBranches.filter((b) => b.id === user.branchId) : allBranches;
  return (
    <>
      <PageHeader title="Walk-in" subtitle="Cliente que llega sin cita: se registra (o se marca como «Visita» si va de paso), se atiende y se cobra. También sirve para vender solo productos." />
      <SaleForm
        action={walkInSaleAction}
        idempotencyKey={crypto.randomUUID()}
        products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, stock: p.trackStock ? p.stock : null }))}
        benefit={{ threshold: shop.pointsForBenefit, percent: shop.benefitPercent }}
        branches={branches}
        walkIn={{ services: services.map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents, durationMinutes: s.durationMinutes })), barbers }}
      />
    </>
  );
}
