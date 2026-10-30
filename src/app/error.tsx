"use client";

import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

// Errores inesperados dentro de una página: se explica con calma y se ofrece reintentar.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-start justify-center px-6 py-20">
      <p className="label-micro text-gold-text">Algo salió mal</p>
      <h1 className="display-secondary mt-4">No pudimos cargar esta página</h1>
      <p className="body-large mt-6 max-w-xl text-steel">
        Fue un problema nuestro, no tuyo. Inténtalo de nuevo; si sigue fallando, vuelve al inicio o comunícate con la barbería.
      </p>
      {error.digest && <p className="mt-4 text-xs text-ash">Código de referencia: {error.digest}</p>}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Button variant="accent" onClick={reset}>Intentar de nuevo</Button>
        <a href="/" className={buttonClasses({ variant: "ghost" })}>Ir al inicio</a>
      </div>
    </main>
  );
}
