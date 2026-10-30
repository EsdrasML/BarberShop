"use client";

import { useState } from "react";
import { MONTHS_ES, daysInMonth, parseDate, shiftMonth, toDateStr, weekdayIndex } from "@/lib/dates";

const HEAD = ["D", "L", "M", "M", "J", "V", "S"]; // la semana empieza en domingo (Guatemala)

/** Calendario de un mes para elegir una fecha con un clic (no se escribe nada). */
export function MonthCalendar({ value, min, max, today, onSelect }: {
  value?: string; min?: string; max?: string; today?: string; onSelect: (date: string) => void;
}) {
  const start = parseDate(value || min || today || "") ?? [new Date().getFullYear(), new Date().getMonth() + 1, 1];
  const [view, setView] = useState({ y: start[0], m: start[1] });

  const total = daysInMonth(view.y, view.m);
  const lead = weekdayIndex(toDateStr(view.y, view.m, 1));
  const prev = shiftMonth(view.y, view.m, -1);
  const next = shiftMonth(view.y, view.m, 1);
  const prevDisabled = !!min && toDateStr(prev.y, prev.m, daysInMonth(prev.y, prev.m)) < min;
  const nextDisabled = !!max && toDateStr(next.y, next.m, 1) > max;

  const arrow = "btn flex size-10 cursor-pointer items-center justify-center rounded-full border border-graphite hover:border-white disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="w-72 select-none" role="group" aria-label={`${MONTHS_ES[view.m - 1]} ${view.y}`}>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" disabled={prevDisabled} onClick={() => setView(prev)} className={arrow}>‹</button>
        <p className="capitalize" aria-live="polite">{MONTHS_ES[view.m - 1]} {view.y}</p>
        <button type="button" aria-label="Mes siguiente" disabled={nextDisabled} onClick={() => setView(next)} className={arrow}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {HEAD.map((h, i) => <span key={i} className="py-1 text-xs text-steel" aria-hidden="true">{h}</span>)}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
          const date = toDateStr(view.y, view.m, d);
          const off = (!!min && date < min) || (!!max && date > max);
          const selected = date === value;
          return (
            <button
              key={d} type="button" disabled={off} onClick={() => onSelect(date)} aria-pressed={selected}
              aria-label={`${d} de ${MONTHS_ES[view.m - 1]} de ${view.y}`}
              className={`btn flex size-9 cursor-pointer items-center justify-center rounded-full text-sm disabled:cursor-not-allowed disabled:opacity-25
                ${selected ? "bg-gold text-on-accent" : "hover:bg-shadow"} ${date === today && !selected ? "border border-gold" : ""}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
