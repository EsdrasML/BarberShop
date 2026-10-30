import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { UserMenu } from "@/components/user-menu";
import { menuItemsFor } from "@/lib/menu";
import { isPlatformOwner } from "@/lib/owner";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getShop } from "@/lib/shop";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, shop] = await Promise.all([requireRole("ADMIN"), getShop()]);
  const branch = user.branchId ? await db.branch.findUnique({ where: { id: user.branchId }, select: { name: true } }) : null;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-charcoal bg-iron lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="px-6 py-6 lg:py-8">
          <p className="text-xl font-semibold">{shop.name} <span className="text-gold-text">Admin</span></p>
          <p className="mt-1 truncate text-sm text-steel">{user.name}{branch ? ` · ${branch.name}` : ""}</p>
        </div>
        <div className="hidden h-px bg-charcoal lg:block" />
        <div className="px-4 pb-4 lg:py-6">
          <AdminNav owner={isPlatformOwner(user)} />
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-6 px-6 py-4 lg:px-10">
          <Link href="/" className="caption text-steel hover:text-gold-text">Ver sitio</Link>
          <UserMenu name={user.name} email={user.email} items={menuItemsFor("ADMIN")} points={null} />
        </div>
        <main className="px-6 pb-16 pt-2 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
