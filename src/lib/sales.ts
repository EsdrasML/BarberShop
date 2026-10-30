import { Prisma } from "@prisma/client";
import { BLOCKING, startedEnough } from "@/lib/appointment-status";
import type { Actor, NewCustomer } from "@/lib/booking";
import { db } from "@/lib/db";
import { formatMoney, percentOfCents } from "@/lib/money";
import type { PaymentMethodName } from "@/lib/payment-methods";
import { getShop } from "@/lib/shop";

export class SaleError extends Error {}

type Tx = Prisma.TransactionClient;
export type PayInput = { method: PaymentMethodName; receivedCents: number | null; reference: string | null; applyBenefit: boolean };
type Rules = { pointsPerService: number; pointsForBenefit: number; benefitPercent: number };

// Los bloqueos serializan operaciones sobre la misma cita, venta o cliente (se liberan al terminar la transacción).
const lock = (tx: Tx, key: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;

async function balanceOf(tx: Tx, customerId: string) {
  const r = await tx.pointsLedger.aggregate({ where: { customerId }, _sum: { delta: true } });
  return r._sum.delta ?? 0;
}

/**
 * Registra el cobro de una venta PENDIENTE: descuento por puntos, pago, y puntos ganados.
 * Todo ocurre dentro de la transacción del llamador, y la venta solo puede cobrarse una vez.
 */
async function finalizePayment(tx: Tx, saleId: string, pay: PayInput, paymentKey: string, actor: Actor, rules: Rules) {
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true } });
  if (sale.status !== "PENDING") throw new SaleError("Esta venta ya fue cobrada o anulada.");

  const serviceItem = sale.items.find((i) => i.type === "SERVICE");
  let discount = 0;

  if (pay.applyBenefit) {
    if (!serviceItem || !sale.customerId) throw new SaleError("El beneficio solo aplica a un servicio con cliente registrado.");
    await lock(tx, `customer:${sale.customerId}`);
    if ((await balanceOf(tx, sale.customerId)) < rules.pointsForBenefit) throw new SaleError("El cliente no tiene puntos suficientes para el beneficio.");
    discount = Math.min(percentOfCents(serviceItem.totalCents, rules.benefitPercent), serviceItem.totalCents);
    // El beneficio queda registrado como consumido y descuenta sus puntos; el historial no se borra.
    const benefit = await tx.loyaltyBenefit.create({
      data: { customerId: sale.customerId, percent: rules.benefitPercent, pointsCost: rules.pointsForBenefit, status: "USED", saleId },
    });
    await tx.pointsLedger.create({
      data: { customerId: sale.customerId, delta: -rules.pointsForBenefit, kind: "REDEEMED", saleId, benefitId: benefit.id, note: `Beneficio ${rules.benefitPercent}%` },
    });
  }

  const total = sale.subtotalCents - discount;
  // El monto a registrar debe ser exactamente el total de la venta: así el dinero registrado cuadra con el desglose.
  const received = pay.receivedCents ?? total;
  if (received !== total) throw new SaleError(`El monto a registrar debe ser igual al total de la venta: ${formatMoney(total)}.`);
  const change = 0;

  const claimed = await tx.sale.updateMany({
    where: { id: saleId, status: "PENDING" },
    data: { status: "PAID", discountCents: discount, totalCents: total, paidAt: new Date() },
  });
  if (claimed.count === 0) throw new SaleError("Esta venta ya fue cobrada o anulada.");

  await tx.payment.create({
    data: { saleId, method: pay.method, amountCents: total, receivedCents: received, changeCents: change, reference: pay.reference, status: "RECORDED", idempotencyKey: paymentKey, recordedById: actor.id },
  });

  // Puntos: una sola vez por servicio cobrado (la restricción única de la base de datos es la última barrera).
  if (sale.appointmentId && sale.customerId && serviceItem && rules.pointsPerService > 0) {
    const earnedBefore = await tx.pointsLedger.findFirst({ where: { appointmentId: sale.appointmentId, kind: "EARNED" }, select: { id: true } });
    await tx.pointsLedger.create({
      data: { customerId: sale.customerId, delta: rules.pointsPerService, kind: "EARNED", saleId, appointmentId: earnedBefore ? null : sale.appointmentId, note: "Servicio completado" },
    });
  }
}

export async function createSale(input: {
  idempotencyKey: string;
  actor: Actor;
  appointmentId?: string;
  branchId?: string | null;
  walkIn?: { customerId?: string; newCustomer?: NewCustomer; barberId?: string; serviceId?: string };
  products: Array<{ productId: string; quantity: number }>;
  payNow: boolean;
  applyBenefit: boolean;
  payment?: { method: PaymentMethodName; receivedCents: number | null; reference: string | null } | null;
}): Promise<{ saleId: string; duplicate: boolean }> {
  const shop = await getShop();
  const rules: Rules = { pointsPerService: shop.pointsPerService, pointsForBenefit: shop.pointsForBenefit, benefitPercent: shop.benefitPercent };
  const { actor } = input;

  // Repetir el mismo envío (doble clic, recarga) devuelve la venta ya creada, nunca una segunda.
  const dup = await db.sale.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
  if (dup) return { saleId: dup.id, duplicate: true };
  if (input.applyBenefit && !input.payNow) throw new SaleError("El beneficio se aplica al registrar el pago.");
  if (input.payNow && !input.payment) throw new SaleError("Elige el método de pago.");

  try {
    const saleId = await db.$transaction(
      async (tx) => {
        let appointmentId: string | null = null;
        let customerId: string | null = null;
        let barberId: string | null = null;
        let serviceLine: { serviceId: string; name: string; priceCents: number } | null = null;

        // La venta pertenece a la sucursal donde se cobra; los puntos, en cambio, son del cliente (valen en todas).
        if (input.branchId) {
          const br = await tx.branch.findUnique({ where: { id: input.branchId }, select: { isActive: true } });
          if (!br || !br.isActive) throw new SaleError("La sucursal no está disponible.");
        }

        if (input.appointmentId) {
          await lock(tx, `appt:${input.appointmentId}`);
          const appt = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { service: true } });
          if (!appt) throw new SaleError("La cita no existe.");
          if (await tx.sale.findFirst({ where: { appointmentId: appt.id, status: { not: "VOID" } }, select: { id: true } })) {
            throw new SaleError("Esta cita ya tiene una venta registrada.");
          }
          if (appt.status === "CONFIRMED" || appt.status === "IN_PROGRESS") {
            if (!startedEnough("COMPLETED", appt.startsAt, new Date())) throw new SaleError("Aún no llega la hora de esta cita.");
            await tx.appointment.update({ where: { id: appt.id }, data: { status: "COMPLETED", completedAt: new Date() } });
            await tx.appointmentStatusHistory.create({ data: { appointmentId: appt.id, fromStatus: appt.status, toStatus: "COMPLETED", changedById: actor.id, note: "Completada al cobrar" } });
          } else if (appt.status !== "COMPLETED") {
            throw new SaleError("Solo se cobran citas confirmadas, en atención o completadas.");
          }
          appointmentId = appt.id;
          customerId = appt.customerId;
          barberId = appt.barberId;
          serviceLine = { serviceId: appt.serviceId, name: appt.service.name, priceCents: appt.priceCents }; // precio acordado al reservar
        } else if (input.walkIn) {
          const w = input.walkIn;
          if (w.customerId) {
            if (!(await tx.customer.findUnique({ where: { id: w.customerId }, select: { id: true } }))) throw new SaleError("El cliente no existe.");
            customerId = w.customerId;
          } else if (w.newCustomer) {
            customerId = (await tx.customer.create({ data: w.newCustomer })).id;
          }
          if (w.barberId) {
            const b = await tx.barber.findUnique({ where: { id: w.barberId } });
            if (!b || !b.isActive || b.deletedAt) throw new SaleError("El barbero no está disponible.");
            barberId = b.id;
          }
          if (w.serviceId) {
            if (!barberId) throw new SaleError("Elige el barbero que atendió.");
            const service = await tx.service.findUnique({ where: { id: w.serviceId } });
            if (!service || !service.isActive || service.deletedAt) throw new SaleError("El servicio no está disponible.");

            // Con cliente, el walk-in queda como una cita ya atendida (historial, puntos y estadísticas).
            // Una visita sin cliente solo registra la venta: no hay cita ni puntos.
            if (customerId) {
            await lock(tx, `barber:${barberId}`);
            const startsAt = new Date(Math.floor(Date.now() / 60_000) * 60_000);
            const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
            const clash = await tx.appointment.findFirst({
              where: { barberId, status: { in: BLOCKING }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
              select: { id: true },
            });
            if (clash) throw new SaleError("Ese barbero tiene una cita en este momento. Elige otro barbero o registra la venta cuando termine.");
            const appt = await tx.appointment.create({
              data: {
                customerId, barberId, branchId: input.branchId ?? null, serviceId: service.id, startsAt, endsAt, status: "COMPLETED", completedAt: startsAt,
                source: actor.role === "BARBER" ? "BARBER" : "ADMIN", priceCents: service.priceCents, durationMinutes: service.durationMinutes,
                notes: "Cliente sin cita (walk-in)", createdById: actor.id,
              },
            });
            await tx.appointmentStatusHistory.create({ data: { appointmentId: appt.id, fromStatus: null, toStatus: "COMPLETED", changedById: actor.id, note: "Walk-in" } });
            appointmentId = appt.id;
            }
            serviceLine = { serviceId: service.id, name: service.name, priceCents: service.priceCents };
          }
        }

        // Productos: precios y nombres se copian a la venta; el inventario baja con una condición atómica.
        const qty = new Map<string, number>();
        for (const l of input.products) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.quantity);
        const ids = [...qty.keys()];
        const products = ids.length ? await tx.product.findMany({ where: { id: { in: ids }, isActive: true, deletedAt: null } }) : [];
        if (products.length !== ids.length) throw new SaleError("Alguno de los productos ya no está disponible.");
        if (!serviceLine && products.length === 0) throw new SaleError("Agrega un servicio o al menos un producto.");

        const items: Prisma.SaleItemUncheckedCreateWithoutSaleInput[] = [];
        if (serviceLine) {
          items.push({ type: "SERVICE", serviceId: serviceLine.serviceId, description: serviceLine.name, quantity: 1, unitPriceCents: serviceLine.priceCents, totalCents: serviceLine.priceCents });
        }
        const stockMoves: Array<{ productId: string; delta: number }> = [];
        for (const p of products) {
          const q = qty.get(p.id)!;
          if (p.trackStock) {
            const r = await tx.product.updateMany({ where: { id: p.id, stock: { gte: q } }, data: { stock: { decrement: q } } });
            if (r.count === 0) throw new SaleError(`Existencias insuficientes de ${p.name}.`);
            stockMoves.push({ productId: p.id, delta: -q });
          }
          items.push({ type: "PRODUCT", productId: p.id, description: p.name, quantity: q, unitPriceCents: p.priceCents, totalCents: q * p.priceCents });
        }

        const subtotal = items.reduce((s, i) => s + i.totalCents, 0);
        const sale = await tx.sale.create({
          data: {
            appointmentId, branchId: input.branchId ?? null, customerId, barberId, status: "PENDING", subtotalCents: subtotal, discountCents: 0, totalCents: subtotal,
            idempotencyKey: input.idempotencyKey, createdById: actor.id, items: { create: items },
          },
        });
        if (stockMoves.length) {
          await tx.stockMovement.createMany({ data: stockMoves.map((m) => ({ ...m, reason: "SALE" as const, saleId: sale.id, createdById: actor.id })) });
        }
        if (input.payNow && input.payment) {
          await finalizePayment(tx, sale.id, { ...input.payment, applyBenefit: input.applyBenefit }, `${input.idempotencyKey}:pay`, actor, rules);
        }
        return sale.id;
      },
      { timeout: 20_000 },
    );
    return { saleId, duplicate: false };
  } catch (e) {
    // Dos envíos simultáneos con la misma llave: gana uno, el otro recibe esa misma venta.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await db.sale.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
      if (again) return { saleId: again.id, duplicate: true };
    }
    throw e;
  }
}

/** Cobra una venta que quedó pendiente. */
export async function paySale(saleId: string, pay: PayInput, idempotencyKey: string, actor: Actor) {
  const shop = await getShop();
  const rules: Rules = { pointsPerService: shop.pointsPerService, pointsForBenefit: shop.pointsForBenefit, benefitPercent: shop.benefitPercent };
  if (await db.payment.findUnique({ where: { idempotencyKey }, select: { id: true } })) return; // ya registrado
  try {
    await db.$transaction(async (tx) => {
      await lock(tx, `sale:${saleId}`);
      await finalizePayment(tx, saleId, pay, idempotencyKey, actor, rules);
    }, { timeout: 20_000 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return; // el mismo pago llegó dos veces
    throw e;
  }
}

/**
 * Anula una venta sin borrar nada: el pago pasa a ANULADO, el inventario regresa y los puntos
 * (ganados y consumidos) se revierten con movimientos nuevos, para que el historial siga siendo auditable.
 */
export async function voidSale(saleId: string, reason: string, actor: Actor) {
  await db.$transaction(async (tx) => {
    await lock(tx, `sale:${saleId}`);
    const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true } });
    if (sale.status === "VOID") throw new SaleError("Esta venta ya está anulada.");

    for (const item of sale.items) {
      if (item.type !== "PRODUCT" || !item.productId) continue;
      const p = await tx.product.findUnique({ where: { id: item.productId } });
      if (p?.trackStock) {
        await tx.product.update({ where: { id: p.id }, data: { stock: { increment: item.quantity } } });
        await tx.stockMovement.create({ data: { productId: p.id, delta: item.quantity, reason: "RETURN", saleId, note: "Venta anulada", createdById: actor.id } });
      }
    }

    if (sale.status === "PAID" && sale.customerId) {
      await tx.payment.updateMany({ where: { saleId, status: "RECORDED" }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason } });
      const earned = await tx.pointsLedger.findMany({ where: { saleId, kind: "EARNED" } });
      for (const e of earned) {
        await tx.pointsLedger.create({ data: { customerId: sale.customerId, delta: -e.delta, kind: "REVERSAL", saleId, note: "Venta anulada: puntos revertidos" } });
      }
      const benefit = await tx.loyaltyBenefit.findUnique({ where: { saleId } });
      if (benefit && benefit.status === "USED") {
        await tx.loyaltyBenefit.update({ where: { id: benefit.id }, data: { status: "REVOKED" } });
        await tx.pointsLedger.create({ data: { customerId: sale.customerId, delta: benefit.pointsCost, kind: "REVERSAL", saleId, benefitId: benefit.id, note: "Venta anulada: beneficio devuelto" } });
      }
    }

    await tx.sale.update({ where: { id: saleId }, data: { status: "VOID", voidedAt: new Date(), voidReason: reason } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "sale.void", entity: "Sale", entityId: saleId, data: { reason, totalCents: sale.totalCents, wasPaid: sale.status === "PAID" } } });
  }, { timeout: 20_000 });
}
