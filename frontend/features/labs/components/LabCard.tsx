"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ACCENT_BG_SOFT, ACCENT_BORDER, ACCENT_TEXT } from "../accents";
import { labLeaderboardPath, labPath } from "../config";
import type { LabConfig } from "../types";
import { DifficultyBadge } from "./DifficultyBadge";
import { LabIcon } from "./LabIcon";

export function LabCard({ lab, className }: { lab: LabConfig; className?: string }) {
  const playHref = labPath(lab.slug);
  const boardHref = labLeaderboardPath(lab.slug);
  const isPlayable = lab.status === "available" || lab.status === "beta";

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-(--shadow-soft)",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset",
            ACCENT_BG_SOFT[lab.accent],
            ACCENT_BORDER[lab.accent],
            ACCENT_TEXT[lab.accent],
          )}
        >
          <LabIcon id={lab.icon} className="h-6 w-6" />
        </div>
        <DifficultyBadge difficulty={lab.difficulty} />
      </div>

      <div className="mt-5 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-ink">{lab.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{lab.description}</p>
        {lab.status === "coming_soon" ? (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Coming soon
          </p>
        ) : lab.status === "beta" ? (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-plum">Beta</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {isPlayable ? (
          <Link href={playHref} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              Play
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" className="w-full flex-1" disabled>
            Play
          </Button>
        )}
        <Link href={boardHref} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Leaderboard
          </Button>
        </Link>
      </div>
    </motion.article>
  );
}
