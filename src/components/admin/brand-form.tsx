"use client";

import { useActionState, useState } from "react";
import { updateBrandAction } from "@/actions/admin/settings";
import { FormAlert } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextAreaField } from "@/components/ui/input";
import { ImageField } from "./image-field";

function ColorField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  const [hex, setHex] = useState(defaultValue);
  const valid = /^#[0-9a-fA-F]{6}$/.test(hex);
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <Field label="Color de acento (botones y detalles)" name="accentColor" value={hex} onChange={(e) => setHex(e.target.value)}
          placeholder="#FFC000" error={error} />
      </div>
      <input type="color" aria-label="Elegir color" value={valid ? hex : "#ffc000"} onChange={(e) => setHex(e.target.value.toUpperCase())}
        className="h-[3.1rem] w-14 cursor-pointer rounded-xl border border-ash bg-black p-1" />
    </div>
  );
}

export function BrandForm({ initial, r2Ready }: { initial: Record<string, string>; r2Ready: boolean }) {
  const [state, action, pending] = useActionState(updateBrandAction, {});
  const e = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  const f = (k: string) => ({ name: k, defaultValue: v[k], error: e[k] });

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      {!r2Ready && <FormAlert>Cloudflare R2 aún no está configurado: por ahora pega URLs de imágenes.</FormAlert>}

      <Card>
        <h2 className="feature-heading mb-6">Identidad y textos</h2>
        <div className="flex flex-col gap-5">
          <Field label="Nombre de la barbería" required {...f("name")} />
          <Field label="Título principal (hero)" required {...f("tagline")} />
          <Field label="Frase sobre el título" required {...f("heroTitle")} />
          <TextAreaField label="Texto secundario (hero)" required {...f("heroSubtitle")} />
          <TextAreaField label="Descripción (Conócenos)" rows={5} {...f("about")} />
        </div>
      </Card>

      <Card>
        <h2 className="feature-heading mb-6">Imágenes</h2>
        <div className="flex flex-col gap-6">
          <ImageField label="Logotipo" {...f("logoUrl")} />
          <ImageField label="Imagen principal (hero)" {...f("heroImageUrl")} />
          <ImageField label="Galería 1 (Conócenos)" {...f("gallery1")} />
          <ImageField label="Galería 2" {...f("gallery2")} />
          <ImageField label="Galería 3" {...f("gallery3")} />
        </div>
      </Card>

      <Card>
        <h2 className="feature-heading mb-2">Google (búsquedas)</h2>
        <p className="mb-6 text-sm text-steel">Así aparece el sitio cuando alguien busca la barbería. Incluye la palabra «barbería» y la ciudad o zona.</p>
        <div className="flex flex-col gap-5">
          <Field label="Título para Google (máx. 60 caracteres)" maxLength={70} placeholder="Barbería en Zona 10, Ciudad de Guatemala | Nombre" {...f("seoTitle")} />
          <TextAreaField label="Descripción para Google (máx. 160 caracteres)" rows={3} maxLength={170} {...f("seoDescription")} />
          <Field label="Ciudad o zona" placeholder="Ciudad de Guatemala" {...f("city")} />
        </div>
      </Card>

      <Card>
        <h2 className="feature-heading mb-6">Color y región</h2>
        <div className="flex flex-col gap-5">
          <ColorField defaultValue={v.accentColor} error={e.accentColor} />
          <Field label="Zona horaria" {...f("timezone")} />
        </div>
      </Card>

      <Button type="submit" variant="accent" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar marca"}</Button>
    </form>
  );
}
