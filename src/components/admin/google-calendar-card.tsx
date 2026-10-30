import { disconnectCalendarAction } from "@/actions/admin/calendar";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { FormAlert } from "@/components/auth/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const flash: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: { tone: "success", text: "Google Calendar conectado. Las citas futuras se están sincronizando." },
  disconnected: { tone: "success", text: "Google Calendar desconectado. Los eventos ya creados quedan en su calendario." },
  denied: { tone: "error", text: "Se canceló la autorización en Google. No se conectó nada." },
  scope: { tone: "error", text: "Faltó marcar el permiso del calendario en la pantalla de Google. Inténtalo de nuevo y deja marcadas todas las casillas." },
  "no-refresh": { tone: "error", text: "Google no concedió el acceso continuo. Quita el acceso de esta app en la cuenta de Google del barbero y vuelve a conectar." },
  invalid: { tone: "error", text: "La conexión expiró o no es válida. Inténtalo de nuevo." },
  failed: { tone: "error", text: "No se pudo completar la conexión con Google. Inténtalo de nuevo." },
  "not-configured": { tone: "error", text: "Google Calendar necesita configuración en el servidor. Sigue docs/GOOGLE.md." },
};

const statusLabel = { CONNECTED: ["Conectado", "done"], NEEDS_REAUTH: ["Necesita reautorizar", "pending"], ERROR: ["Con error", "danger"], DISCONNECTED: ["Sin conectar", "neutral"] } as const;

export function GoogleCalendarCard({ barberId, configured, connection, notice, lastSync }: {
  barberId: string; configured: boolean; notice?: string; lastSync?: string;
  connection: { status: keyof typeof statusLabel; googleEmail: string; lastError: string | null } | null;
}) {
  const f = notice ? flash[notice] : undefined;
  const status = connection ? statusLabel[connection.status] : statusLabel.DISCONNECTED;
  return (
    <Card tone="iron" className="max-w-2xl">
      <h2 className="feature-heading">Google Calendar</h2>
      {f && <div className="mt-4"><FormAlert tone={f.tone}>{f.text}</FormAlert></div>}
      <p className="mt-3 text-steel">
        Las citas se crean en el calendario del barbero, y lo que él tenga ocupado en su calendario deja de ofrecerse para reservar.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Badge tone={status[1]}>{status[0]}</Badge>
        {connection && <span className="text-sm">{connection.googleEmail}</span>}
        {lastSync && <span className="text-sm text-steel">Última sincronización: {lastSync}</span>}
      </div>
      {connection?.lastError && <p className="mt-3 text-sm text-danger">{connection.lastError}</p>}
      {!configured ? (
        <p className="mt-4 text-sm text-steel">Necesita configuración en el servidor (credenciales de Google y clave de cifrado). Sigue docs/GOOGLE.md.</p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={`/api/google-calendar/connect?barberId=${barberId}`} className={buttonClasses({ variant: connection ? "ghost" : "accent", size: "sm" })}>
            {connection ? (connection.status === "CONNECTED" ? "Volver a autorizar" : "Reconectar") : "Conectar con Google"}
          </a>
          {connection && (
            <ConfirmForm action={disconnectCalendarAction.bind(null, barberId)} message="¿Desconectar el calendario? Dejará de sincronizarse; los eventos ya creados se quedan en Google.">
              <Button type="submit" variant="ghost" size="sm" className="text-danger">Desconectar</Button>
            </ConfirmForm>
          )}
        </div>
      )}
      {configured && <p className="mt-4 text-sm text-steel">Al conectar, inicia sesión con la cuenta de Google del barbero (es su calendario el que se usa).</p>}
    </Card>
  );
}
