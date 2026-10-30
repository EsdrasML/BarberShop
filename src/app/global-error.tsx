"use client";

// Último recurso: si falla incluso el diseño principal, esta pantalla simple evita una página en blanco.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-GT">
      <body style={{ margin: 0, background: "#000", color: "#fff", fontFamily: "Arial, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Algo salió mal</h1>
          <p style={{ color: "#969696", lineHeight: 1.5 }}>No pudimos cargar el sitio. Inténtalo de nuevo en un momento.</p>
          <button onClick={reset} style={{ marginTop: 20, background: "#FFC000", color: "#000", border: 0, borderRadius: 999, padding: "14px 28px", fontSize: 16, cursor: "pointer" }}>
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
