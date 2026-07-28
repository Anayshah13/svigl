"use client";

import Link from "next/link";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { labPath } from "./config";
import type { LabConfig } from "./types";
import { LabCanvasPlaceholder } from "./components/LabCanvasPlaceholder";
import { LabHeader } from "./components/LabHeader";
import { LabStatsCard } from "./components/LabStatsCard";

const PLACEHOLDER_STATS = [
  { label: "High score", value: "—", hint: "Best attempt once scoring ships" },
  { label: "Attempts", value: "—", hint: "Your total plays" },
  { label: "Best percentile", value: "—", hint: "Rank among all players" },
] as const;

const RECENT_ATTEMPTS = [
  { id: "a1", label: "Attempt placeholder", meta: "Score · date" },
  { id: "a2", label: "Attempt placeholder", meta: "Score · date" },
  { id: "a3", label: "Attempt placeholder", meta: "Score · date" },
] as const;

export function LabDetailView({ lab }: { lab: LabConfig }) {
  return (
    <div className="page-shell gap-8 sm:gap-10">
      <FadeIn>
        <LabHeader lab={lab} />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)] lg:gap-8">
        <FadeIn delay={0.05}>
          <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-5 shadow-(--shadow-soft) sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-plum">Challenge</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">{lab.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">{lab.description}</p>
              </div>
              <Button variant="primary" size="md" disabled className="mt-3 sm:mt-0">
                Play
              </Button>
            </div>

            <div className="mt-5">
              <LabCanvasPlaceholder lab={lab} />
            </div>

            <p className="mt-4 text-center text-xs text-ink-muted">
              Gameplay is not wired yet — this layout is ready for the canvas engine.
            </p>
          </section>
        </FadeIn>

        <div className="flex flex-col gap-5">
          <FadeInStagger className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1" stagger={0.06}>
            {PLACEHOLDER_STATS.map((stat) => (
              <FadeInItem key={stat.label}>
                <LabStatsCard label={stat.label} value={stat.value} hint={stat.hint} />
              </FadeInItem>
            ))}
          </FadeInStagger>

          <FadeIn delay={0.15}>
            <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-(--shadow-soft)">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Recent attempts</h3>
                <Link
                  href={labPath(lab.slug)}
                  className="text-xs font-semibold text-plum transition-opacity hover:opacity-80"
                >
                  Refresh
                </Link>
              </div>
              <ul className="mt-4 space-y-2.5">
                {RECENT_ATTEMPTS.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex items-center justify-between rounded-xl border border-plum/10 bg-plum-light/30 px-3.5 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{attempt.label}</p>
                      <p className="text-xs text-ink-muted">{attempt.meta}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Soon
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
