"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { requireRole } from "@/lib/session";
import { firstErrors } from "@/lib/validation/auth";
import { productSchema, stockAdjustSchema } from "@/lib/validation/catalog";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function readForm(fd: FormData) {
  const values = {
    name: str(fd, "name"), description: str(fd, "description"), price: str(fd, "price"), imageUrl: str(fd, "imageUrl"),
    initialStock: str(fd, "initialStock") || "0", lowStockAt: str(fd, "lowStockAt") || "3",
  };
  return {
    values,
    input: { ...values, trackStock: fd.get("trackStock") === "on", isActive: fd.get("isActive") === "on" },
  };
}

export async function createProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const { values, input } = readForm(fd);
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { price, initialStock, trackStock, ...rest } = parsed.data;
  const stock = trackStock ? initialStock : 0;
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.create({ data: { ...rest, trackStock, priceCents: price, stock } });
    if (stock > 0) {
      await tx.stockMovement.create({
        data: { productId: p.id, delta: stock, reason: "ADJUSTMENT", note: "Existencias iniciales", createdById: admin.id },
      });
    }
    return p;
  });
  await audit(admin.id, "product.create", "Product", product.id, { name: product.name, priceCents: product.priceCents });
  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}

export async function updateProductAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const { values, input } = readForm(fd);
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const current = await db.product.findFirst({ where: { id, deletedAt: null } });
  if (!current) return { error: "El producto ya no existe." };

  // Las existencias solo cambian mediante ajustes registrados, nunca editando el formulario.
  const { price, initialStock: _ignored, ...rest } = parsed.data;
  void _ignored;
  await db.product.update({ where: { id }, data: { ...rest, priceCents: price } });
  if (current.priceCents !== price) {
    await audit(admin.id, "product.price_change", "Product", id, { from: current.priceCents, to: price });
  }
  revalidatePath("/admin/productos");
  return { message: "Producto guardado.", values };
}

export async function adjustStockAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const values = { delta: str(fd, "delta"), reason: str(fd, "reason"), note: str(fd, "note") };
  const parsed = stockAdjustSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { delta, reason, note } = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      // Condición en la propia sentencia: el stock nunca queda negativo, ni con ajustes simultáneos.
      const r = await tx.product.updateMany({
        where: { id, deletedAt: null, trackStock: true, ...(delta < 0 ? { stock: { gte: -delta } } : {}) },
        data: { stock: { increment: delta } },
      });
      if (r.count === 0) throw new Error("STOCK");
      await tx.stockMovement.create({ data: { productId: id, delta, reason, note, createdById: admin.id } });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") {
      return { error: "No se pudo ajustar: el producto no controla inventario o las existencias no alcanzan.", values };
    }
    throw e;
  }
  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/admin/productos");
  return { message: "Inventario actualizado." };
}

export async function toggleProductAction(id: string) {
  const admin = await requireRole("ADMIN");
  const p = await db.product.findFirst({ where: { id, deletedAt: null } });
  if (!p) return;
  await db.product.update({ where: { id }, data: { isActive: !p.isActive } });
  await audit(admin.id, p.isActive ? "product.deactivate" : "product.activate", "Product", id);
  revalidatePath("/admin/productos");
}

export async function deleteProductAction(id: string) {
  const admin = await requireRole("ADMIN");
  await db.product.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } });
  await audit(admin.id, "product.delete", "Product", id);
  revalidatePath("/admin/productos");
}
