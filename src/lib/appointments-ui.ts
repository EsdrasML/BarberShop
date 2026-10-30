export const statusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En atención",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const statusTone: Record<string, "pending" | "info" | "done" | "danger" | "neutral"> = {
  PENDING: "pending",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "done",
  CANCELLED: "danger",
  NO_SHOW: "neutral",
};

export function formatDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "full", timeZone }).format(date);
}

export function formatTimeRange(start: Date, end: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", timeZone });
  return `${f.format(start)} – ${f.format(end)}`;
}

export function formatShortDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeZone }).format(date);
}
