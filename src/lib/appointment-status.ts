export type Status = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

// Transiciones válidas. COMPLETED, CANCELLED y NO_SHOW son finales.
const NEXT: Record<Status, Status[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const nextStatuses = (from: Status): Status[] => NEXT[from];
export const canTransition = (from: Status, to: Status) => NEXT[from].includes(to);

/** Estados que ocupan el horario del barbero (los mismos que usa la restricción de la base de datos). */
export const BLOCKING: Status[] = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];
/** Citas vigentes (aún sin atender ni cerrar). */
export const OPEN: Status[] = ["PENDING", "CONFIRMED", "IN_PROGRESS"];

const NEEDS_STARTED: Status[] = ["IN_PROGRESS", "COMPLETED", "NO_SHOW"];
export const START_GRACE_MINUTES = 15;

/** Atender, completar o marcar inasistencia solo tiene sentido cuando llegó la hora de la cita. */
export function startedEnough(to: Status, startsAt: Date, now: Date) {
  return !NEEDS_STARTED.includes(to) || now.getTime() >= startsAt.getTime() - START_GRACE_MINUTES * 60_000;
}

export const transitionLabel: Record<Status, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmar",
  IN_PROGRESS: "Iniciar atención",
  COMPLETED: "Marcar completada",
  CANCELLED: "Cancelar",
  NO_SHOW: "No asistió",
};
