"use client";

import { Button } from "@/components/ui/button";

/** Horarios alternativos cuando el elegido ya no está libre. */
export function Suggestions({ items, onPick }: { items: Array<{ startsAt: string; label: string }>; onPick: (startsAt: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="label-micro text-steel">Horarios cercanos disponibles</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Button key={s.startsAt} variant="ghost" size="sm" onClick={() => onPick(s.startsAt)} className="capitalize">{s.label}</Button>
        ))}
      </div>
    </div>
  );
}
