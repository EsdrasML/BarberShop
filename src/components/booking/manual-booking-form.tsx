"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createManualAppointmentAction } from "@/actions/admin/appointments";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { utcToLocalInputs } from "@/lib/tz";
import { DateStrip } from "./date-strip";
import { SlotPicker } from "./slot-picker";
import { Suggestions } from "./suggestions";

type Found = { id: string; fullName: string; email: string | null; phone: string };

function CustomerSearch({ onPick, picked }: { onPick: (c: Found | null) => void; picked: Found | null }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(() => {
      fetch(`/api/admin/customers?q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : { customers: [] }))
        .then((d: { customers: Found[] }) => setResults(d.customers))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  if (picked) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-charcoal p-4">
        <div><p>{picked.fullName}</p><p className="text-sm text-steel">{picked.email ?? "Sin correo"} · {picked.phone || "Sin teléfono"}</p></div>
        <Button variant="ghost" size="sm" onClick={() => { onPick(null); setQ(""); }}>Cambiar</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Field label="Buscar cliente" name="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, correo o teléfono (mínimo 2 letras)" autoComplete="off" />
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-2xl bg-charcoal">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c)} className="btn w-full cursor-pointer border-b border-graphite px-4 py-3 text-left last:border-0 hover:bg-shadow">
                <span className="block">{c.fullName}</span>
                <span className="block text-sm text-steel">{c.email ?? "Sin correo"} · {c.phone || "Sin teléfono"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && results.length === 0 && <p className="text-sm text-steel">Sin resultados. Puedes registrarlo como cliente nuevo.</p>}
    </div>
  );
}

export function ManualBookingForm({ services, barbers, branches, minDate, maxDate, tz }: {
  services: Array<{ id: string; name: string; priceCents: number; durationMinutes: number }>;
  barbers: Array<{ id: string; displayName: string; branchIds: string[] }>;
  branches: Array<{ id: string; name: string }>;
  minDate: string; maxDate: string; tz: string;
}) {
  const [state, action, pending] = useActionState(createManualAppointmentAction, {});
  const e = state.fieldErrors ?? {};
  const [mode, setMode] = useState<"existing" | "new">(state.values?.mode === "new" ? "new" : "existing");
  const [customer, setCustomer] = useState<Found | null>(null);
  const [serviceId, setServiceId] = useState(state.values?.serviceId ?? "");
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0].id : "");
  const [barberId, setBarberId] = useState(state.values?.barberId ?? "");
  const visibleBarbers = barbers.filter((b) => !branchId || b.branchIds.length === 0 || b.branchIds.includes(branchId));
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { if (state.error) setRefresh((n) => n + 1); }, [state]);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.suggestions && <Suggestions items={state.suggestions} onPick={(iso) => { setDate(utcToLocalInputs(new Date(iso), tz).date); setStartsAt(iso); }} />}

      <fieldset className="flex flex-col gap-4">
        <legend className="label-micro mb-2 text-steel">Cliente</legend>
        <div className="flex gap-2">
          {(["existing", "new"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
              className={`btn cursor-pointer rounded-full border px-5 py-2 text-sm ${mode === m ? "border-white bg-white text-black" : "border-graphite text-steel hover:text-white"}`}>
              {m === "existing" ? "Cliente existente" : "Cliente nuevo"}
            </button>
          ))}
        </div>
        <input type="hidden" name="mode" value={mode} />
        {mode === "existing" ? (
          <>
            <CustomerSearch picked={customer} onPick={setCustomer} />
            {customer && <input type="hidden" name="customerId" value={customer.id} />}
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" name="fullName" required defaultValue={state.values?.fullName} error={e.fullName} />
            <Field label="Teléfono" name="phone" type="tel" required defaultValue={state.values?.phone} error={e.phone} />
            <div className="sm:col-span-2"><Field label="Correo (opcional)" name="email" type="email" defaultValue={state.values?.email} error={e.email} /></div>
          </div>
        )}
      </fieldset>

      {branches.length > 1 && (
        <div className="max-w-xs">
          <SelectField label="Sucursal" name="branchId" value={branchId} onChange={(ev) => { setBranchId(ev.target.value); setBarberId(""); setStartsAt(null); }} required>
            <option value="">Elige la sucursal…</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </SelectField>
        </div>
      )}
      {branches.length === 1 && <input type="hidden" name="branchId" value={branchId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Servicio" name="serviceId" value={serviceId} onChange={(ev) => { setServiceId(ev.target.value); setStartsAt(null); }} required>
          <option value="">Elige un servicio…</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatMoney(s.priceCents)} · {s.durationMinutes} min</option>)}
        </SelectField>
        <SelectField label="Barbero" name="barberId" value={barberId} onChange={(ev) => { setBarberId(ev.target.value); setStartsAt(null); }} required>
          <option value="">Elige un barbero…</option>
          {visibleBarbers.map((b) => <option key={b.id} value={b.id}>{b.displayName}</option>)}
        </SelectField>
      </div>

      <DateStrip value={date} min={minDate} max={maxDate} onChange={(d) => { setDate(d); setStartsAt(null); }} />
      <SlotPicker serviceId={serviceId} barberId={barberId} date={date} value={startsAt} onChange={setStartsAt} refreshKey={refresh} />
      {startsAt && <input type="hidden" name="startsAt" value={startsAt} />}

      <TextAreaField label="Notas (opcional)" name="notes" rows={2} defaultValue={state.values?.notes} />
      <Button type="submit" variant="accent" disabled={pending || !startsAt || (mode === "existing" && !customer)} className="self-start">
        {pending ? "Registrando…" : "Registrar cita"}
      </Button>
    </form>
  );
}
