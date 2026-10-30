"use client";

import { useEffect, useState } from "react";
import { MONTHS_SHORT, WEEKDAYS_SHORT, addDays, parseDate, weekdayIndex } from "@/lib/dates";
import { MonthCalendar } from "@/components/ui/month-calendar";

/**
 * Selector de fecha para agendar: una tira de 7 días con flechas y, debajo, el botón
 * «Ver calendario completo» para elegir cualquier fecha mes por mes.
 */
export function DateStrip({ value, onChange, min, max, name = "date" }: {
  value: string; onChange: (date: string) => void; min: string; max: string; name?: string;
}) {
  const [start, setStart] = useState(value || min);
  const [full, setFull] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  useEffect(() => {
    if (value && (value < start || value > addDays(start, 6))) setStart(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const move = (n: number) => {
    const target = addDays(start, n);
    setStart(target < min ? min : target > max ? max : target);
  };
  const choose = (d: string) => {
    onChange(d);
    // Si la fecha elegida queda fuera de la tira, la tira se acomoda para mostrarla.
    if (d < start || d > addDays(start, 6)) setStart(d);
  };

  const arrow = "btn flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-graphite text-lg hover:border-white disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-2 sm:gap-3">
        <button type="button" aria-label="Días anteriores" disabled={start <= min} onClick={() => move(-7)} className={arrow}>‹</button>
        <div className="grid flex-1 grid-cols-7 gap-1.5 sm:gap-3" role="group" aria-label="Elige un día">
          {days.map((d) => {
            const [, m, n] = parseDate(d)!;
            const off = d < min || d > max;
            const on = d === value;
            return (
              <button
                key={d} type="button" disabled={off} aria-pressed={on} onClick={() => choose(d)}
                aria-label={`${WEEKDAYS_SHORT[weekdayIndex(d)]} ${n} de ${MONTHS_SHORT[m - 1]}`}
                className={`btn flex cursor-pointer flex-col items-center rounded-2xl border px-1 py-3 sm:py-4 disabled:cursor-not-allowed disabled:opacity-30
                  ${on ? "border-gold bg-gold text-on-accent" : "border-graphite bg-charcoal hover:border-white"}`}
              >
                <span className={`text-[0.65rem] tracking-wider sm:text-xs ${on ? "" : "text-steel"}`}>{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>
                <span className="text-xl font-semibold sm:text-3xl">{n}</span>
                <span className={`text-[0.65rem] capitalize sm:text-xs ${on ? "" : "text-steel"}`}>{MONTHS_SHORT[m - 1]}</span>
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Días siguientes" disabled={addDays(start, 7) > max} onClick={() => move(7)} className={arrow}>›</button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button type="button" aria-expanded={full} onClick={() => setFull((f) => !f)}
          className="btn cursor-pointer rounded-full border border-gold px-6 py-3 text-sm uppercase tracking-[0.08em] text-gold-text hover:bg-gold hover:text-on-accent">
          {full ? "Ocultar calendario" : "Ver calendario completo"}
        </button>
        {full && (
          <div className="rounded-2xl border border-graphite bg-charcoal p-4">
            <MonthCalendar value={value} min={min} max={max} today={min} onSelect={(d) => { choose(d); setFull(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}
