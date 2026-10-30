"use client";

import { useEffect, useState } from "react";

type Slot = { startsAt: string; label: string };

/** Pide al servidor los horarios libres de un barbero para una fecha y deja elegir uno. */
export function SlotPicker({ serviceId, barberId, date, excludeId, value, onChange, refreshKey = 0 }: {
  serviceId: string; barberId: string; date: string; excludeId?: string; value: string | null; onChange: (startsAt: string | null) => void; refreshKey?: number;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!serviceId || !barberId || !date) return;
    const ctrl = new AbortController();
    setSlots(null);
    setError(false);
    setUnavailable(false);
    const qs = new URLSearchParams({ serviceId, barberId, date, ...(excludeId ? { excludeId } : {}) });
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { slots: Slot[]; unavailable?: boolean }) => {
        setSlots(d.slots);
        setUnavailable(Boolean(d.unavailable));
        if (value && !d.slots.some((s) => s.startsAt === value)) onChange(null);
      })
      .catch((e) => { if (e?.name !== "AbortError") setError(true); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, barberId, date, excludeId, refreshKey]);

  if (!serviceId || !barberId || !date) return <p className="text-sm text-steel">Elige servicio, barbero y fecha para ver los horarios.</p>;
  if (error) return <p role="alert" className="text-sm text-danger">No se pudieron cargar los horarios. Revisa tu conexión e inténtalo de nuevo.</p>;
  if (slots === null) {
    return (
      <div role="status" aria-busy="true" aria-label="Buscando horarios" className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => <span key={i} aria-hidden="true" className="h-11 w-20 animate-pulse rounded-full bg-charcoal motion-reduce:animate-none" />)}
        <span className="sr-only">Buscando horarios…</span>
      </div>
    );
  }
  if (unavailable) return <p role="alert" className="text-sm text-danger">Por ahora no podemos mostrar los horarios de este barbero. Inténtalo de nuevo en unos minutos o comunícate con la barbería.</p>;
  if (slots.length === 0) return <p className="text-sm text-steel">No hay horarios disponibles ese día. Prueba con otra fecha u otro barbero.</p>;

  return (
    <div role="radiogroup" aria-label="Horarios disponibles" className="flex flex-wrap gap-2">
      {slots.map((s) => {
        const selected = value === s.startsAt;
        return (
          <button
            key={s.startsAt} type="button" role="radio" aria-checked={selected} onClick={() => onChange(s.startsAt)}
            className={`btn min-h-11 cursor-pointer rounded-full border px-5 py-2 text-sm ${selected ? "border-gold bg-gold text-on-accent" : "border-graphite text-smoke hover:border-white"}`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
