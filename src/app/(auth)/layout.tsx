import Link from "next/link";
import { getShop } from "@/lib/shop";

export const metadata = { robots: { index: false, follow: false } };

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-[1440px] px-6 py-5 md:px-10">
        <Link href="/" className="text-lg uppercase tracking-[0.12em]">{shop.name}</Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-6 md:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
