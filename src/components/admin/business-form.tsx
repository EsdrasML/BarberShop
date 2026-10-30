"use client";

import { useActionState } from "react";
import { updateBusinessAction } from "@/actions/admin/settings";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextAreaField } from "@/components/ui/input";

export function BusinessForm({ initial }: { initial: Record<string, string> }) {
  const [state, action, pending] = useActionState(updateBusinessAction, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  const f = (k: string) => ({ name: k, defaultValue: v[k], error: e[k] });

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}

      <Card>
        <h2 className="feature-heading mb-6">Contacto y horarios</h2>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Teléfono" type="tel" {...f("phone")} />
            <Field label="Correo de contacto" type="email" {...f("email")} />
          </div>
          <Field label="Dirección" {...f("address")} />
          <TextAreaField label="Horarios (una línea por fila: Día | Horario)" rows={5}
            placeholder={"Lunes a viernes | 9:00 – 18:00\nSábado | 9:00 – 14:00"} {...f("hours")} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Instagram (URL)" {...f("instagram")} />
            <Field label="Facebook (URL)" {...f("facebook")} />
            <Field label="TikTok (URL)" {...f("tiktok")} />
            <Field label="WhatsApp (URL)" {...f("whatsapp")} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="feature-heading mb-2">Reglas del negocio</h2>
        <p className="mb-6 text-sm text-steel">Los cambios se registran en la auditoría y afectan solo a operaciones futuras.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Intervalo entre horarios de inicio (min)" type="number" {...f("slotStepMinutes")} />
          <Field label="Cancelación del cliente hasta (min antes)" type="number" {...f("cancellationMinutes")} />
          <Field label="Puntos por servicio completado" type="number" {...f("pointsPerService")} />
          <Field label="Puntos para obtener el beneficio" type="number" {...f("pointsForBenefit")} />
          <Field label="Descuento del beneficio (%)" type="number" {...f("benefitPercent")} />
        </div>
      </Card>

      <Button type="submit" variant="accent" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar cambios"}</Button>
    </form>
  );
}
