"use client";

import { useCallback, useEffect, useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import type { LabScoreResult } from "@/lib/labs";
import { fetchLabLeaderboard, submitLabScore } from "@/services/labs";
import { useSessionStore } from "@/stores/session";
import type { LabConfig } from "./types";
import { LabChallengeCanvas } from "./components/LabChallengeCanvas";
import { LabHeader } from "./components/LabHeader";
import { LabStatsCard } from "./components/LabStatsCard";
import { ScoreBreakdown } from "./components/ScoreBreakdown";

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
  const [lastResult, setLastResult] = useState<LabScoreResult | null>(null);

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
    setAttempts([]);
    setLastResult(null);
    setLastRejected(false);
  }, [lab.slug]);

  useEffect(() => {
    if (!authReady) return;
    void refreshMine();
  }, [authReady, refreshMine]);

  const onScored = async (result: LabScoreResult) => {
    setLastResult(result);

    if (result.status !== "VALID") {
      setLastRejected(true);
      return;
    }
    setLastRejected(false);
    setAttempts((prev) =>
      [
        { id: `${Date.now()}`, score: result.final_score, at: Date.now() },
        ...prev,
      ].slice(0, 12),
    );

    if (!authUser) {
      setBestScore((prev) =>
        prev == null ? result.final_score : Math.max(prev, result.final_score),
      );
      return;
    }

    try {
      const saved = await submitLabScore(lab.slug, result.final_score);
      setBestScore(saved.score);
      setMyRank(saved.rank);
      void refreshMine();
    } catch {
      // Score UI still shows locally; leaderboard sync is best-effort.
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

      {/* Drawing left · stats + score right */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-6">
        <FadeIn delay={0.04} className="min-w-0">
          <section className="rounded-3xl border border-gray-200/80 bg-white p-3.5 shadow-(--shadow-soft) sm:p-5 lg:p-6">
            <LabChallengeCanvas lab={lab} onScored={onScored} />
          </section>
        </FadeIn>

        <FadeIn delay={0.08} className="flex min-w-0 flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <LabStatsCard
              label="High score"
              value={bestScore == null ? "—" : `${bestScore.toFixed(1)}%`}
              compact
            />
            <LabStatsCard
              label="Attempts"
              value={attempts.length === 0 ? "—" : String(attempts.length)}
              compact
            />
            <LabStatsCard
              label="Your rank"
              value={myRank == null ? "—" : `#${myRank}`}
              compact
            />
          </div>

          {lastResult ? (
            <ScoreBreakdown result={lastResult} compact />
          ) : (
            <div className="flex min-h-36 flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200/90 bg-white/70 px-4 py-8 text-center shadow-(--shadow-soft)">
              <p className="text-sm text-ink-muted">
                Your score breakdown appears here after you release.
              </p>
            </div>
          )}
        </FadeIn>
      </div>

      {/* Full-width past results under the whole grid */}
      <FadeIn delay={0.12}>
        <section className="flex w-full flex-col gap-2.5 rounded-2xl border border-gray-200/80 bg-white px-4 py-3 shadow-(--shadow-soft) sm:px-5 sm:py-3.5">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Past results
          </p>
          {attempts.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {lastRejected
                ? "Last stroke was rejected — try again."
                : "No valid attempts yet."}
            </p>
          ) : (
            <ul className="flex flex-wrap content-start items-center gap-2.5">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center gap-2 rounded-full border border-plum/10 bg-plum-light/35 px-3 py-1.5"
                >
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {attempt.score.toFixed(1)}%
                  </span>
                  <span className="text-xs text-ink-muted">
                    {new Date(attempt.at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </FadeIn>
    </div>
  );
}
