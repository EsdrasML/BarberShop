// "Propietario de la plataforma" = el desarrollador que vende el sistema. Se define por entorno
// (PLATFORM_OWNER_EMAILS), así el cliente nunca puede otorgárselo desde el panel.
export function ownerEmails(): string[] {
  return (process.env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwner(user: { role: string; email: string }): boolean {
  return user.role === "ADMIN" && ownerEmails().includes(user.email.toLowerCase());
}
