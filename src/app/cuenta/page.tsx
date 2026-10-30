import { redirect } from "next/navigation";
import { homeByRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

// Punto de entrada tras iniciar sesión: el rol se lee de la base de datos y decide el destino.
export default async function AccountRedirect() {
  const user = await requireUser();
  redirect(homeByRole[user.role]);
}
