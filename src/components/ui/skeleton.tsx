import { cn } from "@/lib/utils";

/** Bloque gris que «respira» mientras llega el contenido real. Se detiene si la persona prefiere menos movimiento. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-charcoal motion-reduce:animate-none", className)} />;
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-charcoal" aria-hidden="true">
      <div className="h-12 animate-pulse bg-shadow/60 motion-reduce:animate-none" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-graphite px-4 py-5">
          <Skeleton className="size-10 shrink-0 rounded-full bg-shadow" />
          <Skeleton className="h-4 flex-1 bg-shadow" />
          <Skeleton className="hidden h-4 w-24 bg-shadow sm:block" />
          <Skeleton className="h-4 w-16 bg-shadow" />
        </div>
      ))}
    </div>
  );
}
