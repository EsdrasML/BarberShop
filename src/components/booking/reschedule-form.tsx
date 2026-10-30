"use client";

import { useActionState, useEffect, useState } from "react";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { utcToLocalInputs } from "@/lib/tz";
import { DateStrip } from "./date-strip";
import { SlotPicker } from "./slot-picker";
import { Suggestions } from "./suggestions";

/** Reprogramar una cita: fecha nueva + horario libre (y barbero, solo para el administrador). */
export function RescheduleForm({ action, appointmentId, serviceId, barberId, barbers, minDate, maxDate, tz }: {
  action: (p: FormState, fd: FormData) => Promise<FormState>;
  appointmentId: string; serviceId: string; barberId: string;
  barbers?: Array<{ id: string; displayName: string }>; // si se pasa, se puede cambiar de barbero
  minDate: string; maxDate: string; tz: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [barber, setBarber] = useState(barberId);
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { if (state.error) setRefresh((n) => n + 1); }, [state]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.suggestions && <Suggestions items={state.suggestions} onPick={(iso) => { setDate(utcToLocalInputs(new Date(iso), tz).date); setStartsAt(iso); }} />}
      {barbers && (
        <SelectField label="Barbero" name="barberId" value={barber} onChange={(e) => { setBarber(e.target.value); setStartsAt(null); }}>
          {barbers.map((b) => <option key={b.id} value={b.id}>{b.displayName}</option>)}
        </SelectField>
      )}
      <DateStrip name="newDate" value={date} min={minDate} max={maxDate} onChange={(d) => { setDate(d); setStartsAt(null); }} />
      <SlotPicker serviceId={serviceId} barberId={barber} date={date} excludeId={appointmentId} value={startsAt} onChange={setStartsAt} refreshKey={refresh} />
      {startsAt && <input type="hidden" name="startsAt" value={startsAt} />}
      <Button type="submit" variant="accent" disabled={pending || !startsAt} className="self-start">{pending ? "Guardando…" : "Confirmar nuevo horario"}</Button>
    </form>
  );
}
