"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ACCENT_BG_SOFT, ACCENT_TEXT } from "./accents";
import { getAllLabs, labLeaderboardPath, labsPath } from "./config";
import { formatLabScore, getMockLeaderboardSummaries } from "./mock-data";
import { LabIcon } from "./components/LabIcon";
import { SectionHeader } from "./components/SectionHeader";

export function LabsLeaderboardView() {
  const labs = getAllLabs();
  const summaries = getMockLeaderboardSummaries();
  const summaryBySlug = new Map(summaries.map((s) => [s.slug, s]));

  return (
    <div className="page-shell gap-8 sm:gap-10">
      <FadeIn>
        <SectionHeader
          eyebrow="Competition"
          title="Labs Leaderboard"
          description="Browse top scores across every skill challenge."
          action={
            <Link href={labsPath()}>
              <Button variant="outline" size="sm">
                Back to Labs
              </Button>
            </Link>
          }
        />
      </FadeIn>

      <FadeInStagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {labs.map((lab) => {
          const summary = summaryBySlug.get(lab.slug);
          const topScore = summary?.topScore ?? null;
          const entries = summary?.entryCount ?? 0;

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
                    <p className="text-xs text-ink-muted">Skill challenge</p>
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
    </div>
  );
}
