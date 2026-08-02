import { cn } from "@/lib/cn";

export function LabStatsCard({
  label,
  value,
  hint,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Single-row dense stats (no hint). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft)",
        compact ? "px-3 py-3.5 sm:px-4 sm:py-4" : "px-4 py-4",
        className,
      )}
    >
      <p
        className={cn(
          "font-bold uppercase tracking-wider text-ink-muted",
          compact ? "text-xs" : "text-xs",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-bold tracking-tight text-ink",
          compact ? "mt-1.5 text-xl sm:text-2xl" : "mt-2 text-2xl",
        )}
      >
        {value}
      </p>
      {!compact && hint ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
