"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button, buttonClasses } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { CheckField, Field, SelectField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Initial = { type: string; allDay: boolean; startDate: string; endDate: string; startTime: string; endTime: string; reason: string };
export const emptyAbsence: Initial = { type: "VACATION", allDay: true, startDate: "", endDate: "", startTime: "", endTime: "", reason: "" };

export function AbsenceForm({ action, initial, backHref }: { action: (p: FormState, fd: FormData) => Promise<FormState>; initial: Initial; backHref?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [allDay, setAllDay] = useState(initial.allDay);
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  const isAttention = state.message?.includes("Atención") || state.message?.includes("coinciden");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone={isAttention ? "error" : "success"}>{state.message}</FormAlert>}
      <SelectField label="Motivo" name="type" defaultValue={v.type} error={e.type}>
        <option value="VACATION">Vacaciones</option>
        <option value="PERMISSION">Permiso</option>
        <option value="SICK">Enfermedad</option>
        <option value="OTHER">Otro</option>
      </SelectField>
      <CheckField label="Día(s) completo(s)" name="allDay" checked={allDay} onChange={(ev) => setAllDay(ev.target.checked)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <DatePicker label={allDay ? "Desde" : "Fecha"} name="startDate" required defaultValue={v.startDate} error={e.startDate} />
        {allDay && <DatePicker label="Hasta (inclusive, opcional)" name="endDate" defaultValue={v.endDate} error={e.endDate} clearable />}
        {!allDay && (
          <>
            <Field label="Hora de inicio" name="startTime" type="time" required defaultValue={v.startTime} error={e.startTime} />
            <Field label="Hora de fin" name="endTime" type="time" required defaultValue={v.endTime} error={e.endTime} />
          </>
        )}
      </div>
      <Field label="Nota (opcional)" name="reason" defaultValue={v.reason} error={e.reason} />
      <div className="flex gap-3">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar ausencia"}</Button>
        {backHref && <Link href={backHref} className={buttonClasses({ variant: "ghost" })}>Volver</Link>}
      </div>
    </form>
  );
}
