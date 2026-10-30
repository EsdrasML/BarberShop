"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FormState } from "@/lib/form-state";
import { WEEK } from "@/lib/schedule";

const timeClass = "rounded-xl border border-ash bg-black px-3 py-2.5 text-white focus:border-white";

export function ScheduleForm({ action, initial }: { action: (p: FormState, fd: FormData) => Promise<FormState>; initial: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...initial, ...state.values };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <p className="text-sm text-steel">
        Cada día admite dos bloques (por ejemplo mañana y tarde). Deja un día vacío si no trabaja. Las horas son las de la barbería.
      </p>
      <Card tone="iron" className="p-4 md:p-6">
        <ul className="flex flex-col divide-y divide-graphite">
          {WEEK.map(({ weekday, label }) => (
            <li key={weekday} className="grid items-center gap-3 py-4 sm:grid-cols-[110px_1fr]">
              <span>{label}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["a", "b"] as const).map((slot) => (
                    <span key={slot} className="flex items-center gap-2">
                      <input type="time" aria-label={`${label} bloque ${slot === "a" ? 1 : 2} inicio`} name={`${weekday}_${slot}_start`} defaultValue={v[`${weekday}_${slot}_start`]} className={timeClass} />
                      <span className="text-steel">a</span>
                      <input type="time" aria-label={`${label} bloque ${slot === "a" ? 1 : 2} fin`} name={`${weekday}_${slot}_end`} defaultValue={v[`${weekday}_${slot}_end`]} className={timeClass} />
                      {slot === "a" && <span className="mx-2 hidden text-graphite sm:inline">|</span>}
                    </span>
                  ))}
                </div>
                {errors[`day${weekday}`] && <p role="alert" className="mt-2 text-sm text-danger">{errors[`day${weekday}`]}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Button type="submit" variant="accent" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar horario"}</Button>
    </form>
  );
}
