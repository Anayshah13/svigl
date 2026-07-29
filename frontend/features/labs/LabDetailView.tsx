"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import type { LabScoreResult } from "@/lib/labs";
import { fetchLabLeaderboard, submitLabScore } from "@/services/labs";
import { useSessionStore } from "@/stores/session";
import { labPath } from "./config";
import type { LabConfig } from "./types";
import { LabChallengeCanvas } from "./components/LabChallengeCanvas";
import { LabHeader } from "./components/LabHeader";
import { LabStatsCard } from "./components/LabStatsCard";

type Attempt = {
  id: string;
  score: number;
  at: number;
};

export function LabDetailView({ lab }: { lab: LabConfig }) {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [lastRejected, setLastRejected] = useState(false);
  const [boardMessage, setBoardMessage] = useState<string | null>(null);

  const refreshMine = useCallback(async () => {
    try {
      const page = await fetchLabLeaderboard(lab.slug, { limit: 1 });
      setBestScore(page.myBest);
      setMyRank(page.myRank);
    } catch {
      // Leaderboard fetch is best-effort for the side panel.
    }
  }, [lab.slug]);

  useEffect(() => {
    if (!authReady) return;
    void refreshMine();
  }, [authReady, refreshMine]);

  const onScored = async (result: LabScoreResult) => {
    if (result.status !== "VALID") {
      setLastRejected(true);
      setBoardMessage(null);
      return;
    }
    setLastRejected(false);
    setAttempts((prev) =>
      [
        { id: `${Date.now()}`, score: result.final_score, at: Date.now() },
        ...prev,
      ].slice(0, 8),
    );

    if (!authUser) {
      setBoardMessage("Sign in to post your score on the global leaderboard.");
      setBestScore((prev) =>
        prev == null ? result.final_score : Math.max(prev, result.final_score),
      );
      return;
    }

    try {
      const saved = await submitLabScore(lab.slug, result.final_score);
      setBestScore(saved.score);
      setMyRank(saved.rank);
      setBoardMessage(
        saved.is_personal_best
          ? saved.rank != null
            ? `New personal best — you’re #${saved.rank} worldwide.`
            : "New personal best saved to the global board."
          : "Score recorded. Not a new personal best.",
      );
      void refreshMine();
    } catch (err) {
      setBoardMessage(
        err instanceof Error ? err.message : "Could not save score to the leaderboard.",
      );
    }
  };

  return (
    <div className="page-shell page-shell-lab">
      <div className="lg:hidden">
        <LabHeader lab={lab} compact />
      </div>
      <FadeIn className="hidden lg:block">
        <LabHeader lab={lab} />
      </FadeIn>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)] lg:gap-8">
        {/* Play zone owns the first mobile viewport; stats sit below it. */}
        <div className="lab-play-zone min-h-0">
          <FadeIn delay={0.05} className="flex min-h-0 flex-1 flex-col">
            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-gray-200/80 bg-white p-3 shadow-(--shadow-soft) sm:p-5 lg:p-6">
              <div className="mb-5 hidden lg:block">
                <p className="text-xs font-bold uppercase tracking-widest text-plum">
                  Challenge
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">
                  {lab.name}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{lab.description}</p>
              </div>

              <LabChallengeCanvas lab={lab} onScored={onScored} fillHeight />
              {boardMessage ? (
                <p className="mt-3 shrink-0 text-center text-xs font-medium text-ink-muted lg:mt-4">
                  {boardMessage}
                </p>
              ) : null}
            </section>
          </FadeIn>
        </div>

        <div className="flex flex-col gap-5">
          <FadeInStagger
            className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1"
            stagger={0.06}
          >
            <FadeInItem>
              <LabStatsCard
                label="High score"
                value={bestScore == null ? "—" : `${bestScore.toFixed(1)}%`}
                hint="Your global personal best"
              />
            </FadeInItem>
            <FadeInItem>
              <LabStatsCard
                label="Attempts"
                value={attempts.length === 0 ? "—" : String(attempts.length)}
                hint="Valid scores this session"
              />
            </FadeInItem>
            <FadeInItem>
              <LabStatsCard
                label="Your rank"
                value={myRank == null ? "—" : `#${myRank}`}
                hint="Among all players on this board"
              />
            </FadeInItem>
          </FadeInStagger>

          <FadeIn delay={0.15}>
            <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-(--shadow-soft)">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                  Recent attempts
                </h3>
                <Link
                  href={labPath(lab.slug)}
                  className="inline-flex min-h-11 touch-manipulation items-center text-xs font-semibold text-plum transition-opacity hover:opacity-80 sm:min-h-0"
                >
                  Refresh
                </Link>
              </div>
              {attempts.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">
                  {lastRejected
                    ? "Last stroke was rejected — try again."
                    : "No valid attempts yet. Draw a stroke to score."}
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {attempts.map((attempt) => (
                    <li
                      key={attempt.id}
                      className="flex items-center justify-between rounded-xl border border-plum/10 bg-plum-light/30 px-3.5 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {attempt.score.toFixed(1)}%
                        </p>
                        <p className="text-xs text-ink-muted">
                          {new Date(attempt.at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-plum">
                        Valid
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
