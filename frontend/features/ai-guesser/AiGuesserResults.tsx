"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { AiGuessMatchState } from "./types";
import { formatSplitMs } from "./format";
import { aiGuesserLeaderboardPath, aiGuesserPath } from "./week";

export function AiGuesserResults({
  match,
  onReplay,
}: {
  match: AiGuessMatchState;
  onReplay: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#fafaf8]/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-plum/15 bg-white p-6 shadow-(--shadow-card)">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-plum">
          {match.isPersonalBest ? "New best" : "Finished"}
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink">
          {match.totalMs != null ? formatSplitMs(match.totalMs) : "—"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {match.rank != null ? `You’re #${match.rank} this week.` : "Time posted."}
        </p>
        <ol className="mt-4 space-y-2">
          {match.splits.map((split, index) => (
            <li
              key={`${index}-${split.ms}`}
              className="flex items-center justify-between rounded-xl bg-plum-light/50 px-3 py-2 text-sm"
            >
              <span className="text-ink-muted">Drawing {index + 1}</span>
              {split.solved ? (
                <span className="font-mono font-semibold text-ink">
                  {formatSplitMs(split.ms)}
                </span>
              ) : (
                <span className="font-mono font-semibold text-pink" aria-label="Missed">
                  ✕ {formatSplitMs(split.ms)}
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="sm" className="flex-1" onClick={onReplay}>
            Play again
          </Button>
          <Link href={aiGuesserLeaderboardPath(match.gameSlug)} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Leaderboard
            </Button>
          </Link>
        </div>
        <Link
          href={aiGuesserPath()}
          className="mt-3 block text-center text-sm font-semibold text-plum"
        >
          All weekly games
        </Link>
      </div>
    </div>
  );
}
