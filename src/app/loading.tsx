import { Skeleton } from "@/components/ui/skeleton";

// Se muestra mientras carga cualquier página pública (por ejemplo la portada) y después aparece el contenido.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="hidden h-6 w-96 md:block" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="mx-auto max-w-[1440px] px-6 pt-24 md:px-10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-16 w-full max-w-3xl md:h-24" />
        <Skeleton className="mt-3 h-16 w-2/3 max-w-2xl md:h-24" />
        <Skeleton className="mt-8 h-5 w-full max-w-xl" />
        <div className="mt-10 flex gap-4"><Skeleton className="h-14 w-44 rounded-full" /><Skeleton className="h-14 w-44 rounded-full" /></div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
