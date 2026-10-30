"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireOwner } from "@/lib/session";
import { serviceSchema } from "@/lib/validation/catalog";
import { firstErrors } from "@/lib/validation/auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function readForm(fd: FormData) {
  const values = {
    name: str(fd, "name"), description: str(fd, "description"), price: str(fd, "price"),
    durationMinutes: str(fd, "durationMinutes"), imageUrl: str(fd, "imageUrl"), sortOrder: str(fd, "sortOrder") || "0",
  };
  return { values, input: { ...values, isActive: fd.get("isActive") === "on" } };
}

function toData(p: ReturnType<typeof serviceSchema.parse>) {
  const { price, ...rest } = p;
  return { ...rest, priceCents: price };
}

export async function createServiceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireOwner();
  const { values, input } = readForm(fd);
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const service = await db.service.create({ data: toData(parsed.data) });
  await audit(admin.id, "service.create", "Service", service.id, { name: service.name, priceCents: service.priceCents });
  revalidatePath("/admin/servicios");
  redirect("/admin/servicios");
}

export async function updateServiceAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireOwner();
  const { values, input } = readForm(fd);
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const current = await db.service.findFirst({ where: { id, deletedAt: null } });
  if (!current) return { error: "El servicio ya no existe." };

  const data = toData(parsed.data);
  await db.service.update({ where: { id }, data });
  // Las citas ya reservadas conservan su precio y duración (instantánea en Appointment).
  if (current.priceCents !== data.priceCents) {
    await audit(admin.id, "service.price_change", "Service", id, { from: current.priceCents, to: data.priceCents });
  }
  revalidatePath("/admin/servicios");
  return { message: "Servicio guardado.", values };
}

export async function toggleServiceAction(id: string) {
  const admin = await requireOwner();
  const s = await db.service.findFirst({ where: { id, deletedAt: null } });
  if (!s) return;
  await db.service.update({ where: { id }, data: { isActive: !s.isActive } });
  await audit(admin.id, s.isActive ? "service.deactivate" : "service.activate", "Service", id);
  revalidatePath("/admin/servicios");
}

export async function deleteServiceAction(id: string) {
  const admin = await requireOwner();
  // Eliminación lógica: el historial de citas y ventas sigue apuntando al servicio.
  await db.service.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } });
  await audit(admin.id, "service.delete", "Service", id);
  revalidatePath("/admin/servicios");
}
