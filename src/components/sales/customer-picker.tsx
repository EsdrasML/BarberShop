"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";

type Found = { id: string; fullName: string; email: string | null; phone: string; points: number };
export type PickerMode = "existing" | "new" | "none";

/** Cliente de una venta de mostrador: existente, nuevo (se registra en el momento) o sin cliente. */
export function CustomerPicker({ errors, onChange }: { errors: Record<string, string>; onChange: (info: { mode: PickerMode; points: number; hasCustomer: boolean }) => void }) {
  const [mode, setMode] = useState<PickerMode>("existing");
  const [picked, setPicked] = useState<Found | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    onChange({ mode, points: mode === "existing" ? (picked?.points ?? 0) : 0, hasCustomer: mode === "new" || (mode === "existing" && !!picked) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, picked]);

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

  const labels: Record<PickerMode, string> = { existing: "Cliente existente", new: "Cliente nuevo", none: "Visita" };

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="label-micro mb-2 text-steel">Cliente</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as PickerMode[]).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`btn cursor-pointer rounded-full border px-5 py-2 text-sm ${mode === m ? "border-white bg-white text-black" : "border-graphite text-steel hover:text-white"}`}>
            {labels[m]}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />

      {mode === "existing" && (picked ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-charcoal p-4">
          <div>
            <p>{picked.fullName}</p>
            <p className="text-sm text-steel">{picked.email ?? "Sin correo"} · {picked.phone || "Sin teléfono"} · <span className="text-gold-text">★ {picked.points} pts</span></p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setPicked(null); setQ(""); }}>Cambiar</Button>
          <input type="hidden" name="customerId" value={picked.id} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Field label="Buscar cliente" name="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, correo o teléfono (mínimo 2 letras)" autoComplete="off" />
          {results.length > 0 && (
            <ul className="overflow-hidden rounded-2xl bg-charcoal">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setPicked(c)} className="btn w-full cursor-pointer border-b border-graphite px-4 py-3 text-left last:border-0 hover:bg-shadow">
                    <span className="block">{c.fullName}</span>
                    <span className="block text-sm text-steel">{c.email ?? "Sin correo"} · {c.phone || "Sin teléfono"} · ★ {c.points}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && results.length === 0 && <p className="text-sm text-steel">Sin resultados. Puedes registrarlo como cliente nuevo.</p>}
        </div>
      ))}

      {mode === "new" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" name="fullName" required error={errors.fullName} />
          <Field label="Teléfono" name="phone" type="tel" required error={errors.phone} />
          <div className="sm:col-span-2"><Field label="Correo (opcional)" name="email" type="email" error={errors.email}
            hint="Si luego se registra con este correo, verá su historial y sus puntos." /></div>
        </div>
      )}
      {mode === "none" && <p className="text-sm text-steel">Persona de paso que no necesita registrarse: se cobra sin guardar sus datos y no acumula puntos.</p>}
    </fieldset>
  );
}
