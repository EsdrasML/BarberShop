import { db } from "@/lib/db";

/**
 * Garantiza el perfil de cliente de un usuario ya VERIFICADO.
 * Si el local registró antes a esa persona (mismo correo, sin cuenta), se une a ese registro y
 * hereda su historial y sus puntos. Solo se une por correo verificado, nunca por teléfono.
 */
export async function ensureCustomerForUser(user: { id: string; name: string; email: string; phone: string | null }) {
  const own = await db.customer.findUnique({ where: { userId: user.id } });
  if (own) return own;

  const walkIn = await db.customer.findFirst({
    where: { userId: null, email: { equals: user.email, mode: "insensitive" } },
  });
  if (walkIn) {
    return db.customer.update({
      where: { id: walkIn.id },
      data: { userId: user.id, ...(walkIn.phone ? {} : { phone: user.phone ?? "" }) },
    });
  }
  return db.customer.create({
    data: { userId: user.id, fullName: user.name, email: user.email.toLowerCase(), phone: user.phone ?? "" },
  });
}
