export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="sub-section">{title}</h1>
        {subtitle && <p className="mt-2 text-steel">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-charcoal">
      <table className="w-full min-w-[680px] text-left text-sm">{children}</table>
    </div>
  );
}

export const th = "label-micro px-4 py-3 font-normal text-steel";
export const td = "px-4 py-4 align-middle";
export const rowClass = "border-t border-graphite";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-graphite p-8 text-steel">{children}</div>;
}
