"use client";

import { useActionState, useEffect, useState } from "react";
import { bookAppointmentAction } from "@/actions/booking";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { utcToLocalInputs } from "@/lib/tz";
import { DateStrip } from "./date-strip";
import { SlotPicker } from "./slot-picker";
import { Suggestions } from "./suggestions";

type Service = { id: string; name: string; description: string | null; priceCents: number; durationMinutes: number };
type Barber = { id: string; displayName: string; bio: string | null; photoUrl: string | null; branchIds: string[] };
type Branch = { id: string; name: string; address: string | null };

const choice = (on: boolean) =>
  `btn w-full cursor-pointer rounded-2xl border p-5 text-left ${on ? "border-gold bg-charcoal" : "border-graphite hover:border-white"}`;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="feature-heading"><span className="mr-3 text-gold-text">{n}.</span>{title}</h2>
      {children}
    </section>
  );
}

export function BookingFlow({ services, barbers, branches, phone, minDate, maxDate, tz, initialServiceId }: {
  services: Service[]; barbers: Barber[]; branches: Branch[]; phone: string; minDate: string; maxDate: string; tz: string; initialServiceId?: string;
}) {
  const [state, action, pending] = useActionState(bookAppointmentAction, {});
  const askBranch = branches.length > 1;
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0].id : "");
  const [serviceId, setServiceId] = useState(services.some((s) => s.id === initialServiceId) ? initialServiceId! : "");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Un barbero sin sucursales asignadas atiende en todas.
  const visibleBarbers = barbers.filter((b) => !branchId || b.branchIds.length === 0 || b.branchIds.includes(branchId));
  const barberOk = visibleBarbers.some((b) => b.id === barberId);
  const effectiveBarber = barberOk ? barberId : visibleBarbers.length === 1 ? visibleBarbers[0].id : "";

  // Si el horario se ocupó, se vuelven a pedir los libres.
  useEffect(() => { if (state.error) setRefresh((n) => n + 1); }, [state]);

  const service = services.find((s) => s.id === serviceId);
  const barber = visibleBarbers.find((b) => b.id === effectiveBarber);
  const branch = branches.find((b) => b.id === branchId);
  const pick = (iso: string) => { setDate(utcToLocalInputs(new Date(iso), tz).date); setStartsAt(iso); };
  const pretty = startsAt ? new Intl.DateTimeFormat("es-GT", { dateStyle: "full", timeStyle: "short", hourCycle: "h23", timeZone: tz }).format(new Date(startsAt)) : "";
  let n = 0;

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-12">
      {askBranch && (
        <Step n={++n} title="Sucursal">
          <div className="grid gap-3 sm:grid-cols-2">
            {branches.map((b) => (
              <button key={b.id} type="button" aria-pressed={branchId === b.id} onClick={() => { setBranchId(b.id); setBarberId(""); setStartsAt(null); }} className={choice(branchId === b.id)}>
                <span className="feature-heading block text-[1.25rem]">{b.name}</span>
                {b.address && <span className="mt-1 block text-sm text-steel">{b.address}</span>}
              </button>
            ))}
          </div>
        </Step>
      )}

      <Step n={++n} title="Servicio">
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button key={s.id} type="button" aria-pressed={serviceId === s.id} onClick={() => { setServiceId(s.id); setStartsAt(null); }} className={choice(serviceId === s.id)}>
              <span className="feature-heading block text-[1.25rem]">{s.name}</span>
              {s.description && <span className="mt-1 block text-sm text-steel">{s.description}</span>}
              <span className="mt-3 flex justify-between text-sm"><span className="text-gold-text">{formatMoney(s.priceCents)}</span><span className="text-steel">{s.durationMinutes} min</span></span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={++n} title="Barbero">
        {askBranch && !branchId ? (
          <p className="text-sm text-steel">Elige primero la sucursal para ver sus barberos.</p>
        ) : visibleBarbers.length === 0 ? (
          <p className="text-sm text-steel">No hay barberos disponibles en esta sucursal por ahora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleBarbers.map((b) => (
              <button key={b.id} type="button" aria-pressed={effectiveBarber === b.id} onClick={() => { setBarberId(b.id); setStartsAt(null); }} className={choice(effectiveBarber === b.id)}>
                <span className="flex items-center gap-3">
                  {b.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.photoUrl} alt="" className="size-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-gold/15 text-gold-text" aria-hidden="true">{b.displayName.charAt(0).toUpperCase()}</span>
                  )}
                  <span><span className="block">{b.displayName}</span>{b.bio && <span className="block text-sm text-steel">{b.bio}</span>}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Step>

      <Step n={++n} title="Fecha y hora">
        <DateStrip value={date} min={minDate} max={maxDate} onChange={(d) => { setDate(d); setStartsAt(null); }} />
        <SlotPicker serviceId={serviceId} barberId={effectiveBarber} date={date} value={startsAt} onChange={setStartsAt} refreshKey={refresh} />
      </Step>

      <Step n={++n} title="Confirma tu reserva">
        {service && barber && startsAt ? (
          <div className="flex flex-col gap-5">
            <dl className="grid gap-2 rounded-2xl bg-charcoal p-6 text-sm sm:grid-cols-2">
              {branch && <div className="sm:col-span-2"><dt className="label-micro text-steel">Sucursal</dt><dd>{branch.name}{branch.address ? ` · ${branch.address}` : ""}</dd></div>}
              <div><dt className="label-micro text-steel">Servicio</dt><dd>{service.name}</dd></div>
              <div><dt className="label-micro text-steel">Barbero</dt><dd>{barber.displayName}</dd></div>
              <div className="sm:col-span-2"><dt className="label-micro text-steel">Cuándo</dt><dd className="capitalize">{pretty} · {service.durationMinutes} min</dd></div>
              <div><dt className="label-micro text-steel">Precio</dt><dd className="text-gold-text">{formatMoney(service.priceCents)}</dd></div>
            </dl>
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="barberId" value={effectiveBarber} />
            <input type="hidden" name="startsAt" value={startsAt} />
            <div className="max-w-xs">
              <Field label="Teléfono de contacto" name="phone" type="tel" required defaultValue={phone} error={state.fieldErrors?.phone} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-steel">Completa los pasos anteriores para ver el resumen.</p>
        )}
        {state.error && <FormAlert>{state.error}</FormAlert>}
        {state.suggestions && <Suggestions items={state.suggestions} onPick={pick} />}
        <Button type="submit" variant="accent" size="lg" disabled={pending || !startsAt} className="self-start">{pending ? "Reservando…" : "Confirmar reserva"}</Button>
      </Step>
    </form>
  );
}
