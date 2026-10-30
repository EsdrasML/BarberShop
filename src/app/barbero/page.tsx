import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/session";

export default async function Page() {
  const user = await requireRole("BARBER");
  return (
    <DashboardShell user={user} title="Panel del barbero">
      <Card>
        <p className="feature-heading">Hola, {user.name}</p>
        <p className="mt-3 text-steel">Tu sesión y tu rol funcionan. Este panel se construye en las siguientes fases.</p>
      </Card>
    </DashboardShell>
  );
}
