"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { DotPulseGrid } from "@/features/loaders";
import { isAbortError } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  fetchAiGuesserLeaderboard,
  type AiGuesserLeaderboardPage,
} from "@/services/ai-guesser";
import { useSessionStore } from "@/stores/session";
import { BestScore, BestScoreSplits } from "./BestScore";
import { formatSplitMs } from "./format";
import { aiGuesserGamePath, aiGuesserPath } from "./week";

export function AiGuesserLeaderboard({ gameSlug }: { gameSlug: string }) {
  const authUser = useSessionStore((s) => s.authUser);
  const [page, setPage] = useState<AiGuesserLeaderboardPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAiGuesserLeaderboard(gameSlug, controller.signal)
      .then(setPage)
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError("Could not load the board.");
      });
    return () => controller.abort();
  }, [gameSlug, authUser?.id]);

  return (
    <div className="page-shell gap-8 pb-16 sm:gap-10">
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-plum">
              This week
            </p>
            <h1 className="mt-1 font-display text-3xl text-ink">
              {page?.gameTitle ?? "Leaderboard"}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Ranked by total time. Missed drawings count as 70.0s.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={aiGuesserGamePath(gameSlug)}>
              <Button variant="primary" size="sm">
                Play
              </Button>
            </Link>
            <Link href={aiGuesserPath()}>
              <Button variant="outline" size="sm">
                All games
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      {page ? (
        <FadeIn delay={0.04}>
          <div className="flex flex-col gap-3 rounded-2xl border border-plum/15 bg-plum-light/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-plum">
                Your best this week
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {page.myBestMs != null
                  ? "Your fastest finished run on this board."
                  : "Play a run to post a time."}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <BestScore bestMs={page.myBestMs} rank={page.myRank} />
              {page.mySplits ? <BestScoreSplits splits={page.mySplits} /> : null}
            </div>
          </div>
        </FadeIn>
      ) : null}

      {!page && !error ? (
        <div className="flex justify-center py-16">
          <DotPulseGrid size="sm" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-dashed border-pink/30 bg-pink/5 px-4 py-10 text-center text-sm text-ink-muted">
          {error}
        </p>
      ) : page && page.entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-plum/20 bg-white/70 px-4 py-10 text-center text-sm text-ink-muted">
          No times yet this week. Be the first to finish a run.
        </p>
      ) : (
        <FadeIn delay={0.05}>
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 border-collapse text-left">
                <thead>
                  <tr className="border-b border-plum/10 bg-plum-light/40">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Player
                    </th>
                    {Array.from({ length: 5 }, (_, i) => (
                      <th
                        key={i}
                        className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-ink-muted"
                      >
                        {i + 1}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page?.entries.map((entry) => {
                    const isMe = Boolean(
                      authUser?.id && entry.userId === authUser.id,
                    );
                    return (
                      <tr
                        key={`${entry.rank}-${entry.userId}`}
                        className={cn(
                          "border-b border-gray-100 last:border-b-0",
                          isMe && "bg-plum-light/50",
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-ink">
                          {entry.rank}
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink">
                          {entry.player}
                          {isMe ? (
                            <span className="ml-2 text-xs font-bold uppercase tracking-wider text-plum">
                              You
                            </span>
                          ) : null}
                        </td>
                        {Array.from({ length: 5 }, (_, i) => {
                          const split = entry.splits[i];
                          return (
                            <td
                              key={i}
                              className="px-3 py-3 text-center font-mono text-sm"
                            >
                              {!split ? (
                                "—"
                              ) : split.solved ? (
                                formatSplitMs(split.ms)
                              ) : (
                                <span className="font-semibold text-pink" aria-label="Missed">
                                  ✕
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right font-mono font-semibold text-plum">
                          {formatSplitMs(entry.totalMs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
