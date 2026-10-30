"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { SaleError, createSale, paySale, voidSale } from "@/lib/sales";
import { assertAppointmentAccess, assertSaleAccess, resolveAdminBranch } from "@/lib/scope";
import { requireRole } from "@/lib/session";
import { firstErrors } from "@/lib/validation/auth";
import { customerSchema } from "@/lib/validation/people";
import { parseSaleFields } from "@/lib/validation/sales";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const get = (fd: FormData) => (k: string) => str(fd, k);
const key = (fd: FormData) => str(fd, "idempotencyKey").slice(0, 80) || crypto.randomUUID();

function done(saleId: string): never {
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/citas");
  redirect(`/admin/ventas/${saleId}?ok=1`);
}

/** Cobro de una cita: el servicio se toma de la cita (precio acordado) y se pueden sumar productos. */
export async function chargeAppointmentAction(appointmentId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertAppointmentAccess(admin, appointmentId);
  const parsed = parseSaleFields(get(fd));
  if (!parsed.ok) return { error: parsed.error };
  const branch = await resolveAdminBranch(admin, str(fd, "branchId"));
  if (!branch.ok) return { error: branch.error };

  let saleId: string;
  try {
    const r = await createSale({ idempotencyKey: key(fd), actor: { id: admin.id, role: "ADMIN" }, appointmentId, branchId: branch.id, ...parsed.value });
    saleId = r.saleId;
    if (!r.duplicate) await audit(admin.id, "sale.create", "Sale", saleId, { appointmentId, paid: parsed.value.payNow });
  } catch (e) {
    if (e instanceof SaleError) return { error: e.message };
    throw e;
  }
  done(saleId);
}

/** Venta de mostrador: cliente sin cita (con o sin servicio) y/o productos. */
export async function walkInSaleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const parsed = parseSaleFields(get(fd));
  if (!parsed.ok) return { error: parsed.error };

  const branch = await resolveAdminBranch(admin, str(fd, "branchId"));
  if (!branch.ok) return { error: branch.error };
  const mode = str(fd, "mode");
  const serviceId = str(fd, "serviceId") || undefined;
  const barberId = str(fd, "barberId") || undefined;
  let customerId: string | undefined;
  let newCustomer: { fullName: string; phone: string; email: string | null } | undefined;

  if (mode === "existing") {
    customerId = str(fd, "customerId") || undefined;
    if (!customerId) return { error: "Selecciona un cliente o elige «Visita»." };
  } else if (mode === "new") {
    const c = customerSchema.safeParse({ fullName: str(fd, "fullName"), phone: str(fd, "phone"), email: str(fd, "email") });
    if (!c.success) return { fieldErrors: firstErrors(c.error) };
    if (c.data.email && (await db.customer.findFirst({ where: { email: { equals: c.data.email, mode: "insensitive" } }, select: { id: true } }))) {
      return { fieldErrors: { email: "Ya existe un cliente con ese correo. Búscalo como cliente existente." } };
    }
    newCustomer = c.data;
  }

  let saleId: string;
  try {
    const r = await createSale({
      idempotencyKey: key(fd), actor: { id: admin.id, role: "ADMIN" }, branchId: branch.id,
      walkIn: { customerId, newCustomer, barberId, serviceId }, ...parsed.value,
    });
    saleId = r.saleId;
    if (!r.duplicate) await audit(admin.id, "sale.create_walkin", "Sale", saleId, { paid: parsed.value.payNow });
  } catch (e) {
    if (e instanceof SaleError) return { error: e.message };
    throw e;
  }
  done(saleId);
}

export async function payPendingAction(saleId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertSaleAccess(admin, saleId);
  const fields = parseSaleFields(get(fd));
  if (!fields.ok) return { error: fields.error };

  try {
    await paySale(saleId, { ...fields.value.payment, applyBenefit: fields.value.applyBenefit }, key(fd), { id: admin.id, role: "ADMIN" });
    await audit(admin.id, "sale.pay", "Sale", saleId);
  } catch (e) {
    if (e instanceof SaleError) return { error: e.message };
    throw e;
  }
  done(saleId);
}

export async function voidSaleAction(saleId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  await assertSaleAccess(admin, saleId);
  const reason = str(fd, "reason").trim().slice(0, 200);
  if (reason.length < 3) return { fieldErrors: { reason: "Escribe el motivo de la anulación." } };
  try {
    await voidSale(saleId, reason, { id: admin.id, role: "ADMIN" });
  } catch (e) {
    if (e instanceof SaleError) return { error: e.message };
    throw e;
  }
  done(saleId);
}
