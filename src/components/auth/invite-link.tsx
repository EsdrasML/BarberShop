"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Enlace de invitación que se puede copiar cuando el correo no pudo salir. */
export function InviteLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-charcoal p-4">
      <input readOnly value={link} aria-label="Enlace de invitación" onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-xl border border-ash bg-black px-3 py-2.5 text-sm text-white" />
      <Button variant="ghost" size="sm" className="self-start"
        onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
        {copied ? "Copiado" : "Copiar enlace"}
      </Button>
    </div>
  );
}
