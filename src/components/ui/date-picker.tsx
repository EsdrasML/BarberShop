"use client";

import { useEffect, useRef, useState } from "react";
import { formatDMY } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MonthCalendar } from "./month-calendar";

/**
 * Selector de fecha: se elige en un calendario (no se escribe) y se muestra como día/mes/año.
 * Envía el valor como YYYY-MM-DD en un campo oculto, así que sirve en formularios normales.
 */
export function DatePicker({ label, name, value, defaultValue = "", onChange, min, max, today, required, error, clearable = false }: {
  label: string; name: string; value?: string; defaultValue?: string; onChange?: (date: string) => void;
  min?: string; max?: string; today?: string; required?: boolean; error?: string; clearable?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value !== undefined ? value : inner;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  const set = (d: string) => { setInner(d); onChange?.(d); setOpen(false); };
  const id = `dp-${name}`;

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      <label htmlFor={id} className="label-micro text-steel">{label}</label>
      <input type="hidden" name={name} value={current} required={required} />
      <button
        id={id} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full cursor-pointer items-center justify-between rounded-xl border bg-black px-4 py-3.5 text-left text-base hover:border-white",
          error ? "border-danger" : "border-ash", current ? "text-white" : "text-ash")}
      >
        <span>{current ? formatDMY(current) : "dd/mm/aaaa"}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      </button>
      {open && (
        <div role="dialog" aria-label={`Elegir ${label.toLowerCase()}`} className="absolute left-0 top-full z-30 mt-2 rounded-2xl border border-graphite bg-charcoal p-4">
          <MonthCalendar value={current} min={min} max={max} today={today} onSelect={set} />
          {clearable && current && <button type="button" onClick={() => set("")} className="mt-3 cursor-pointer text-sm text-steel hover:text-white">Borrar fecha</button>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
