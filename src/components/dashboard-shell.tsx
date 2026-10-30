import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/user-menu";
import { menuItemsFor } from "@/lib/menu";
import type { RoleName } from "@/lib/roles";

const roleLabel: Record<RoleName, string> = { ADMIN: "Administrador", BARBER: "Barbero", CLIENT: "Cliente" };

export function DashboardShell({
  user,
  title,
  children,
}: {
  user: { name: string; email: string; role: RoleName };
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-3 md:px-10">
          <Link href="/" className="text-lg uppercase tracking-[0.12em]">Barber Shop</Link>
          <div className="flex items-center gap-4">
            <Badge tone="info" className="hidden sm:inline-flex">{roleLabel[user.role]}</Badge>
            <UserMenu name={user.name} email={user.email} items={menuItemsFor(user.role)} points={null} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-6 py-12 md:px-10">
        <h1 className="section-heading">{title}</h1>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
