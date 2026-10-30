import type { DefaultSession } from "next-auth";
import type { RoleName } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: RoleName } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: RoleName;
  }
}
