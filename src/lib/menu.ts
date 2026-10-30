import type { RoleName } from "@/lib/roles";

export type MenuItem = { label: string; href: string };

export function menuItemsFor(role: RoleName): MenuItem[] {
  const password = { label: "Cambiar contraseña", href: "/cuenta/seguridad" };
  if (role === "CLIENT") {
    return [
      { label: "Mi perfil", href: "/cliente" },
      { label: "Historial de citas", href: "/cliente/citas" },
      { label: "Historial de puntos", href: "/cliente/puntos" },
      password,
    ];
  }
  if (role === "BARBER") return [{ label: "Mi panel", href: "/barbero" }, password];
  return [{ label: "Panel administrativo", href: "/admin" }, password];
}
