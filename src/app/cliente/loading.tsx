import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
