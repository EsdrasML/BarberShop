export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  needsVerification?: boolean;
  /** Enlace que el invitador puede copiar y enviar a mano si el correo no salió. */
  link?: string;
  /** Horarios alternativos cuando el elegido ya no está libre. */
  suggestions?: Array<{ startsAt: string; label: string }>;
};
