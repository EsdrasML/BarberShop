"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";

// Campo de imagen: sube el archivo a R2 y guarda la URL, o permite pegar una URL https.
export function ImageField({ name, label, defaultValue = "", error }: { name: string; label: string; defaultValue?: string; error?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setInfo(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (res.ok) {
        setUrl(data.url);
        const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
        setInfo(`Imagen optimizada: de ${kb(data.before)} a ${kb(data.after)}.`);
      }
      else setMsg(data.error ?? "No se pudo subir la imagen.");
    } catch {
      setMsg("Error de red al subir la imagen.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={label} name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
        hint="Sube una imagen (JPG, PNG o WebP, máx. 8 MB): se comprime sola. O pega una URL https." error={error ?? msg ?? undefined} />
      <div className="flex flex-wrap items-center gap-3">
        {url && /^https:\/\//.test(url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-16 rounded-xl object-cover" />
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Subiendo…" : "Subir imagen"}
        </Button>
        {url && <Button variant="ghost" size="sm" onClick={() => setUrl("")}>Quitar</Button>}
      </div>
      {info && <p className="text-sm text-cyan-pulse" role="status">{info}</p>}
    </div>
  );
}
