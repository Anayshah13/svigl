"use client";

import { ResultReveal } from "@/features/loaders";
import { usePhaseCountdown } from "@/hooks/usePhaseCountdown";
import { formatDisplayName } from "@/lib/names";
import type { Room } from "@/types/room";

export function RoundEndPanel({ room }: { room: Room }) {
  const { game } = room;
  const remaining = usePhaseCountdown(
    game.phaseEndsAt,
    game.serverTime,
    game.remainingSeconds,
  );
  const summary = game.roundSummary;
  const word = summary?.word ?? game.secretWord;
  const revealKey = `${game.sessionId ?? "game"}-${game.roundNumber}-end`;

  return (
    <div className="rounded-3xl border border-plum/15 bg-white/95 px-6 py-8 text-center shadow-sm sm:px-10">
      <ResultReveal revealKey={revealKey} label="Tallying scores…">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
          Round {game.roundNumber} of {game.totalRounds}
        </p>
        <h2 className="mt-3 text-2xl font-bold text-ink">
          {word ? (
            <>
              The word was{" "}
              <span className="font-mono tracking-wide text-green">{word}</span>
            </>
          ) : (
            "Turn complete"
          )}
        </h2>

        {summary?.guessed && summary.guessed.length > 0 ? (
          <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left">
            {summary.guessed.map((entry) => (
              <li
                key={entry.playerId}
                className="flex items-center justify-between rounded-2xl bg-green-light/50 px-4 py-2 text-sm"
              >
                <span className="font-semibold text-ink">
                  {formatDisplayName(entry.playerName)}
                </span>
                <span className="font-mono font-bold text-green">+{entry.points}</span>
              </li>
            ))}
          </ul>
        ) : summary ? (
          <p className="mt-4 text-sm text-ink-muted">Nobody guessed this round.</p>
        ) : game.guessedPlayerIds.length > 0 ? (
          <p className="mt-4 text-sm font-medium text-green">
            {game.guessedPlayerIds.length} player
            {game.guessedPlayerIds.length === 1 ? "" : "s"} guessed correctly.
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Nobody guessed this round.</p>
        )}

        <p className="mt-5 text-sm text-ink-muted">
          Next drawer in {remaining !== null ? `${remaining}s` : "…"}
        </p>
      </ResultReveal>
    </div>
  );
}
