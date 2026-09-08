import { cn } from "@/lib/cn";
import type { AiGuessSplit } from "./types";
import { formatSplitMs } from "./format";

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 px-3 py-1.5 text-center">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-plum">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 leading-none",
          emphasize
            ? "font-mono text-lg font-semibold text-plum"
            : "font-display text-lg text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function BestScoreCorner({
  bestMs,
  rank,
}: {
  bestMs: number | null;
  rank: number | null;
}) {
  if (bestMs == null && rank == null) return null;
  return (
    <div
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-plum/15 bg-white px-2.5 py-1 shadow-(--shadow-soft)"
      aria-label={[
        rank != null ? `Rank ${rank}` : null,
        bestMs != null ? `Best ${formatSplitMs(bestMs)}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      {rank != null ? (
        <span className="font-display text-sm leading-none text-ink">#{rank}</span>
      ) : null}
      {rank != null && bestMs != null ? (
        <span className="h-3 w-px bg-plum/20" aria-hidden />
      ) : null}
      {bestMs != null ? (
        <span className="font-mono text-xs font-semibold leading-none text-plum">
          {formatSplitMs(bestMs)}
        </span>
      ) : null}
    </div>
  );
}

export function BestScore({
  bestMs,
  rank,
  className,
}: {
  bestMs: number | null;
  rank: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-xl border border-plum/15 bg-plum-light/50",
        className,
      )}
    >
      <Stat label="Rank" value={rank != null ? `#${rank}` : "—"} />
      <div className="w-px self-stretch bg-plum/15" aria-hidden />
      <Stat
        label="Best"
        value={bestMs != null ? formatSplitMs(bestMs) : "—"}
        emphasize
      />
    </div>
  );
}

export function BestScoreSplits({ splits }: { splits: AiGuessSplit[] }) {
  if (splits.length === 0) return null;
  return (
    <ol className="flex min-w-0 flex-wrap gap-1.5">
      {splits.map((split, index) => (
        <li
          key={`${index}-${split.ms}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs",
            split.solved ? "bg-white/80 text-ink" : "bg-pink/10 text-pink",
          )}
        >
          <span className="text-[0.6rem] font-bold text-ink-muted">{index + 1}</span>
          {split.solved ? formatSplitMs(split.ms) : "✕"}
        </li>
      ))}
    </ol>
  );
}
