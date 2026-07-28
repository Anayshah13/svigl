"use client";

import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { labPath, labsLeaderboardPath } from "./config";
import { getMockLeaderboard } from "./mock-data";
import type { LabConfig } from "./types";
import { LabHeader } from "./components/LabHeader";
import { LeaderboardTable } from "./components/LeaderboardTable";

export function LabLeaderboardView({ lab }: { lab: LabConfig }) {
  const entries = getMockLeaderboard(lab.slug);

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
              Highest scores for {lab.name}. Mock data for UI preview.
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

      <FadeIn delay={0.1}>
        <LeaderboardTable entries={entries} />
      </FadeIn>
    </div>
  );
}
