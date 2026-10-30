"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/actions/auth";
import type { MenuItem } from "@/lib/menu";

type Props = { name: string; email: string; items: MenuItem[]; points: number | null };

export function UserMenu({ name, email, items, points }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const firstName = name.split(" ")[0] || name;
  const itemClass = "block rounded-xl px-4 py-2.5 text-sm text-smoke hover:bg-shadow";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-full border border-white/50 py-1.5 pl-1.5 pr-4 text-sm hover:border-white"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-gold text-sm font-medium text-on-accent" aria-hidden="true">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-32 truncate">{firstName}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={open ? "rotate-180" : ""}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-graphite bg-charcoal p-2 shadow-none">
          <div className="px-4 py-3">
            <p className="truncate">{name}</p>
            <p className="truncate text-sm text-steel">{email}</p>
          </div>

          {points !== null && (
            <Link href="/cliente/puntos" role="menuitem" className="mx-2 mb-2 flex items-center justify-between rounded-xl bg-black px-4 py-3">
              <span className="label-micro text-steel">Puntos acumulados</span>
              <span className="text-lg text-gold-text">{points}</span>
            </Link>
          )}

          {items.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" className={itemClass}>
              {item.label}
            </Link>
          ))}

          <div className="my-2 h-px bg-graphite" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className={`${itemClass} w-full cursor-pointer text-left`}>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
