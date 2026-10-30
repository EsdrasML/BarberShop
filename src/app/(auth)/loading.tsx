import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className="flex flex-col gap-5 rounded-2xl bg-charcoal p-8">
      <Skeleton className="h-9 w-48 bg-shadow" />
      <Skeleton className="h-14 w-full bg-shadow" />
      <Skeleton className="h-14 w-full bg-shadow" />
      <Skeleton className="h-12 w-40 rounded-full bg-shadow" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
