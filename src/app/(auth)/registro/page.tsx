import { redirect } from "next/navigation";
import { googleEnabled } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";
import { homeByRole } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeByRole[user.role]);

  return (
    <Card>
      <h1 className="sub-section mb-8">Crear cuenta</h1>
      <RegisterForm googleEnabled={googleEnabled} />
    </Card>
  );
}
