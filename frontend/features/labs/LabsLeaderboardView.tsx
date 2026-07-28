"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SviglLabsLogo } from "@/components/layout/SviglLabsLogo";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { DotPulseGrid } from "@/features/loaders";
import { cn } from "@/lib/cn";
import { fetchLabLeaderboardSummaries } from "@/services/labs";
import { ACCENT_BG_SOFT, ACCENT_TEXT } from "./accents";
import { getAllLabs, labLeaderboardPath, labsPath } from "./config";
import { formatLabScore } from "./format";
import type { LabLeaderboardSummary } from "./types";
import { LabIcon } from "./components/LabIcon";
import { SectionHeader } from "./components/SectionHeader";

export function LabsLeaderboardView() {
  const labs = getAllLabs();
  const [summaries, setSummaries] = useState<LabLeaderboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLabLeaderboardSummaries()
      .then((items) => {
        if (!cancelled) setSummaries(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboards");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summaryBySlug = new Map(summaries.map((s) => [s.slug, s]));

  return (
    <div className="page-shell gap-8 sm:gap-10">
      <FadeIn>
        <SectionHeader
          eyebrow="Leaderboards"
          title={<SviglLabsLogo size="default" link={false} />}
          description="Global top scores across every skill challenge."
          action={
            <Link href={labsPath()}>
              <Button variant="outline" size="sm">
                Back to Labs
              </Button>
            </Link>
          }
        />
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
        <FadeInStagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {labs.map((lab) => {
            const summary = summaryBySlug.get(lab.slug);
            const topScore = summary?.topScore ?? null;
            const entries = summary?.entryCount ?? 0;
            const topPlayer = summary?.topPlayer ?? null;

            return (
              <FadeInItem key={lab.id}>
                <motion.article
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="flex h-full flex-col rounded-2xl border border-gray-200/80 bg-white p-6 shadow-(--shadow-soft)"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl",
                        ACCENT_BG_SOFT[lab.accent],
                        ACCENT_TEXT[lab.accent],
                      )}
                    >
                      <LabIcon id={lab.icon} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-ink">{lab.name}</h2>
                      <p className="truncate text-xs text-ink-muted">
                        {topPlayer ? `Led by ${topPlayer}` : "No scores yet"}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-plum-light/40 px-3 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Top score
                      </dt>
                      <dd className="mt-1 text-xl font-bold tabular-nums text-ink">
                        {topScore == null ? "—" : formatLabScore(topScore)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-green-light/50 px-3 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Entries
                      </dt>
                      <dd className="mt-1 text-xl font-bold tabular-nums text-ink">{entries}</dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <Link href={labLeaderboardPath(lab.slug)}>
                      <Button variant="primary" size="sm" className="w-full">
                        Open leaderboard
                      </Button>
                    </Link>
                  </div>
                </motion.article>
              </FadeInItem>
            );
          })}
        </FadeInStagger>
      )}
    </div>
  );
}
