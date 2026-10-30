// Sin dependencias de Prisma: también se usa en el middleware (runtime edge).
export type RoleName = "ADMIN" | "BARBER" | "CLIENT";

export const homeByRole: Record<RoleName, string> = {
  ADMIN: "/admin",
  BARBER: "/barbero",
  CLIENT: "/cliente",
};

export const protectedAreas: Array<{ prefix: string; roles?: RoleName[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/barbero", roles: ["BARBER"] },
  { prefix: "/cliente", roles: ["CLIENT"] },
  { prefix: "/agendar", roles: ["CLIENT"] },
  { prefix: "/cuenta" }, // cualquier usuario autenticado; redirige según su rol
];
