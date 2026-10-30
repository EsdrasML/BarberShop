"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav({ items, label = "Mi cuenta" }: { items: Array<{ href: string; label: string; exact?: boolean }>; label?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`btn rounded-full border px-5 py-2.5 text-sm ${active ? "border-white bg-white text-black" : "border-graphite text-steel hover:border-white hover:text-white"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
