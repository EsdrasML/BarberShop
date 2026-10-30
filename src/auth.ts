import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { ensureCustomerForUser } from "@/lib/customers";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import { authConfig } from "./auth.config";

// Hash de relleno: se compara igualmente cuando el correo no existe, para no revelar su existencia por tiempo.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("relleno-no-valido", 12));

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? getDummyHash());
        if (!user || !user.passwordHash || !ok || !user.isActive || !user.emailVerified) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    ...(googleEnabled
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Con Google solo se admite un correo que Google ya verificó.
    async signIn({ account, profile }) {
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
    // El rol SIEMPRE sale de la base de datos al iniciar sesión, nunca del navegador.
    async jwt({ token, user }) {
      if (user?.id) {
        const row = await db.user.findUnique({ where: { id: user.id }, select: { id: true, role: true } });
        if (row) {
          token.id = row.id;
          token.role = row.role;
        }
      }
      return token;
    },
  },
  events: {
    // Usuarios creados por Google: siempre CLIENT (valor por defecto del esquema) + su perfil de cliente.
    async createUser({ user }) {
      if (!user.id) return;
      const verified = await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      await ensureCustomerForUser(verified);
    },
  },
});
