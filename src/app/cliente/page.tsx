import { ProfileForm } from "@/components/account/profile-form";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getPointsBalance } from "@/lib/points";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

export default async function ProfilePage() {
  const user = await requireRole("CLIENT");
  const [shop, points, customer] = await Promise.all([
    getShop(),
    getPointsBalance(user.id),
    db.customer.findUnique({ where: { userId: user.id }, select: { fullName: true, phone: true } }),
  ]);
  const target = shop.pointsForBenefit;
  const percent = Math.min(100, Math.round((points / target) * 100));
  const missing = Math.max(0, target - points);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <h1 className="sub-section mb-8">Mi perfil</h1>
        <ProfileForm fullName={customer?.fullName ?? user.name} phone={customer?.phone ?? user.phone ?? ""} email={user.email} />
      </Card>

      <Card tone="iron" className="self-start">
        <p className="label-micro text-steel">Puntos acumulados</p>
        <p className="sub-section mt-2">{points}</p>
        <div
          className="mt-6 h-2 overflow-hidden rounded-full bg-graphite"
          role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(points, target)}
          aria-label="Progreso hacia tu próximo beneficio"
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-4 text-sm text-steel">
          {missing === 0
            ? `¡Tienes un beneficio disponible! ${shop.benefitPercent}% de descuento en tu próximo servicio.`
            : `Te faltan ${missing} puntos para un ${shop.benefitPercent}% de descuento. Ganas ${shop.pointsPerService} puntos por cada servicio completado, en cualquier sucursal.`}
        </p>
      </Card>
    </div>
  );
}
