import { cn } from "@/lib/cn";
import { formatLabDate, formatLabScore } from "../mock-data";
import type { LeaderboardEntry } from "../types";
import { EmptyState } from "./EmptyState";

export function LeaderboardTable({
  entries,
  scoreLabel = "Score",
  emptyTitle = "No scores yet",
  emptyDescription = "Be the first to set a record for this challenge.",
  className,
}: {
  entries: LeaderboardEntry[];
  scoreLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft)",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-plum/10 bg-plum-light/40">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted sm:px-5">
                Rank
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted sm:px-5">
                Player
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted sm:px-5">
                {scoreLabel}
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted sm:px-5">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.rank}-${entry.player}`}
                className={cn(
                  "border-b border-gray-100 last:border-b-0 transition-colors hover:bg-plum-light/25",
                  index < 3 && "bg-white",
                )}
              >
                <td className="px-4 py-3.5 sm:px-5">
                  <RankCell rank={entry.rank} />
                </td>
                <td className="px-4 py-3.5 font-semibold text-ink sm:px-5">{entry.player}</td>
                <td className="px-4 py-3.5 tabular-nums font-semibold text-plum sm:px-5">
                  {formatLabScore(entry.score)}
                </td>
                <td className="px-4 py-3.5 text-sm text-ink-muted sm:px-5">
                  {formatLabDate(entry.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    const styles =
      rank === 1
        ? "bg-chartreuse/35 text-ink"
        : rank === 2
          ? "bg-plum-light text-plum"
          : "bg-pink-light text-pink";

    return (
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
          styles,
        )}
      >
        {rank}
      </span>
    );
  }

  return <span className="pl-2 text-sm font-semibold text-ink-muted">{rank}</span>;
}
