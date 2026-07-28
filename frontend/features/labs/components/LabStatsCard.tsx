import { cn } from "@/lib/cn";

export function LabStatsCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200/80 bg-white px-4 py-4 shadow-(--shadow-soft)",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
