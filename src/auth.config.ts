// Configuración compatible con el runtime edge (middleware): sin Prisma ni bcrypt.
import type { NextAuthConfig } from "next-auth";
import { protectedAreas, type RoleName } from "@/lib/roles";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  trustHost: true,
  callbacks: {
    // Filtro de rutas "grueso" con el rol del token. La validación real (rol y estado activo
    // leídos de la base de datos) la hacen requireRole() y las acciones del servidor.
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      const area = protectedAreas.find((a) => path === a.prefix || path.startsWith(a.prefix + "/"));
      if (!area) return true;
      if (!auth?.user) return false; // → /login
      if (area.roles && !area.roles.includes(auth.user.role as RoleName)) {
        return Response.redirect(new URL("/cuenta", nextUrl));
      }
      return true;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as RoleName;
      return session;
    },
  },
} satisfies NextAuthConfig;
