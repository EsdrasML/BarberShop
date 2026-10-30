import { cn } from "@/lib/utils";

// Espacio para fotografías reales (se reemplaza al subir imágenes desde el panel).
export function ImagePlaceholder({ label = "Imagen pendiente", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-graphite bg-iron text-ash", className)}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
      <span className="label-micro">{label}</span>
    </div>
  );
}
