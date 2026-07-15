"use client";

import { cn } from "@/lib/cn";
import type { VoteKickTally } from "@/services/app-websocket";
import { requiredVotes } from "@/hooks/useVoteKick";

export function VoteKickButton({
  targetId,
  selfId,
  playerCount,
  tally,
  onToggle,
  compact = false,
}: {
  targetId: string;
  selfId?: string;
  playerCount: number;
  tally?: VoteKickTally;
  onToggle: (targetId: string) => void;
  compact?: boolean;
}) {
  if (!selfId || targetId === selfId) return null;

  const votes = tally?.votes ?? 0;
  const required = tally?.required ?? requiredVotes(playerCount);
  const voted = Boolean(tally?.voterIds.includes(selfId));

  return (
    <button
      type="button"
      onClick={() => onToggle(targetId)}
      title={voted ? "Retract vote-kick" : "Vote to kick"}
      aria-pressed={voted}
      aria-label={
        voted
          ? `Retract vote-kick (${votes} of ${required})`
          : `Vote to kick (${votes} of ${required})`
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1 font-semibold transition-colors",
        compact
          ? "rounded-lg px-1.5 py-0.5 text-[10px]"
          : "rounded-xl px-2.5 py-1.5 text-xs",
        voted
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "bg-plum-light/60 text-ink-muted hover:bg-red-50 hover:text-red-500",
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden="true"
      >
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.94 6.94a.75.75 0 011.06 0L10 8.94l1.999-2a.75.75 0 111.061 1.061L11.06 10l2 1.999a.75.75 0 11-1.061 1.061L10 11.06l-1.999 2a.75.75 0 11-1.061-1.061L8.94 10l-2-1.999a.75.75 0 010-1.061z" />
      </svg>
      <span className="font-mono tabular-nums">
        {votes}/{required}
      </span>
    </button>
  );
}
