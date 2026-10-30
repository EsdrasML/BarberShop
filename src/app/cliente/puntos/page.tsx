import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/appointments-ui";
import { db } from "@/lib/db";
import { getPointsBalance } from "@/lib/points";
import { requireRole } from "@/lib/session";
import { getShop } from "@/lib/shop";

const kindLabel: Record<string, string> = {
  EARNED: "Puntos ganados",
  REDEEMED: "Beneficio utilizado",
  REVERSAL: "Puntos revertidos",
  ADJUSTMENT: "Ajuste",
};

export default async function PointsPage() {
  const user = await requireRole("CLIENT");
  const [shop, balance, entries] = await Promise.all([
    getShop(),
    getPointsBalance(user.id),
    db.pointsLedger.findMany({
      where: { customer: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <h1 className="sub-section">Historial de puntos</h1>
      <p className="mt-3 mb-8 text-steel">
        Saldo actual: <span className="text-gold-text">{balance} puntos</span>. Ganas {shop.pointsPerService} puntos por servicio completado;
        al llegar a {shop.pointsForBenefit} obtienes {shop.benefitPercent}% de descuento. Tus puntos se acumulan y valen en todas las sucursales.
      </p>
      {entries.length === 0 ? (
        <Card tone="iron"><p className="text-steel">Todavía no tienes movimientos. Tus puntos aparecerán aquí al completar tu primer servicio.</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Card tone="iron" className="flex items-center justify-between gap-4 p-5 md:p-6">
                <div>
                  <p>{kindLabel[e.kind]}</p>
                  <p className="text-sm text-steel">{formatShortDate(e.createdAt, shop.timezone)}{e.note ? ` · ${e.note}` : ""}</p>
                </div>
                <p className={e.delta >= 0 ? "text-gold-text" : "text-steel"}>{e.delta > 0 ? `+${e.delta}` : e.delta}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
