import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isPlatformOwner } from "@/lib/owner";
import { type RoleName } from "@/lib/roles";

/** Usuario actual validado contra la base de datos (rol y estado vigentes). */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, branchId: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: RoleName[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/cuenta");
  return user;
}

/** Solo el propietario de la plataforma (marca y apariencia del sitio). El administrador del negocio NO pasa. */
export async function requireOwner() {
  const user = await requireRole("ADMIN");
  if (!isPlatformOwner(user)) redirect("/admin");
  return user;
}
