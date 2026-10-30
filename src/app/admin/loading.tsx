import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

// Esqueleto del panel: título, tarjetas y tabla. El menú lateral ya está en pantalla y no parpadea.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="mt-10"><SkeletonTable rows={6} /></div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
