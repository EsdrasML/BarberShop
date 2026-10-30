import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main role="status" aria-busy="true" aria-label="Cargando" className="mx-auto max-w-5xl px-6 py-12 md:px-10">
      <Skeleton className="mb-10 h-12 w-72" />
      <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="mt-12 h-8 w-48" />
      <div className="mt-4 grid max-w-3xl grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <span className="sr-only">Cargando…</span>
    </main>
  );
}
