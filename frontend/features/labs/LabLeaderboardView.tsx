"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { DotPulseGrid } from "@/features/loaders";
import { useSessionStore } from "@/stores/session";
import { fetchLabLeaderboard, type LabLeaderboardPage } from "@/services/labs";
import { labPath, labsLeaderboardPath } from "./config";
import type { LabConfig } from "./types";
import { LabHeader } from "./components/LabHeader";
import { LeaderboardTable } from "./components/LeaderboardTable";

export function LabLeaderboardView({ lab }: { lab: LabConfig }) {
  const authUser = useSessionStore((s) => s.authUser);
  const [page, setPage] = useState<LabLeaderboardPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLabLeaderboard(lab.slug)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboard");
          setPage(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lab.slug]);

  return (
    <div className="page-shell gap-8 sm:gap-10">
      <FadeIn>
        <LabHeader
          lab={lab}
          backHref={labsLeaderboardPath()}
          backLabel="All leaderboards"
          showLeaderboard={false}
        />
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Top players</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {page?.myBest != null && page.myRank != null
                ? `Global personal bests for ${lab.name}. You’re #${page.myRank} at ${page.myBest.toFixed(1)}%.`
                : `Global personal bests for ${lab.name}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={labPath(lab.slug)}>
              <Button variant="primary" size="sm">
                Play challenge
              </Button>
            </Link>
            <Link href={labsLeaderboardPath()}>
              <Button variant="outline" size="sm">
                All boards
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex justify-center py-16">
          <DotPulseGrid size="sm" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-dashed border-pink/30 bg-pink/5 px-4 py-10 text-center text-sm text-ink-muted">
          {error}
        </p>
      ) : (
        <FadeIn delay={0.1}>
          <LeaderboardTable
            entries={page?.entries ?? []}
            highlightUserId={authUser?.id}
            emptyTitle="No scores yet"
            emptyDescription={`Be the first to set a record on ${lab.name}. Sign in, play, and your best score lands here for everyone.`}
          />
        </FadeIn>
      )}
    </div>
  );
}
