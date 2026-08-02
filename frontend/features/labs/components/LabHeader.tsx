import Link from "next/link";
import { SviglLabsLogo } from "@/components/layout/SviglLabsLogo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ACCENT_BG_SOFT, ACCENT_TEXT } from "../accents";
import { labLeaderboardPath, labsPath } from "../config";
import type { LabConfig } from "../types";
import { DifficultyBadge } from "./DifficultyBadge";
import { LabIcon } from "./LabIcon";

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LabHeader({
  lab,
  backHref = labsPath(),
  backLabel = "Back to Labs",
  showLeaderboard = true,
  compact = false,
  className,
}: {
  lab: LabConfig;
  backHref?: string;
  backLabel?: string;
  showLeaderboard?: boolean;
  /** Mobile play chrome: title + leaderboard. */
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <header className={cn("flex shrink-0 items-center gap-2 sm:gap-3", className)}>
        <Link
          href={backHref}
          aria-label={backLabel}
          className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-plum-light/50 hover:text-plum"
        >
          <BackArrowIcon />
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              ACCENT_BG_SOFT[lab.accent],
              ACCENT_TEXT[lab.accent],
            )}
          >
            <LabIcon id={lab.icon} className="h-5 w-5" />
          </div>
          <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
            {lab.name}
          </h1>
        </div>

        {showLeaderboard ? (
          <Link href={labLeaderboardPath(lab.slug)} className="shrink-0 touch-manipulation">
            <Button variant="outline" size="sm" className="min-h-10 touch-manipulation">
              Leaderboard
            </Button>
          </Link>
        ) : null}
      </header>
    );
  }

  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {/* Top utility row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex min-h-10 w-fit touch-manipulation items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-plum"
        >
          <BackArrowIcon />
          {backLabel}
        </Link>
        {showLeaderboard ? (
          <Link href={labLeaderboardPath(lab.slug)} className="shrink-0 touch-manipulation">
            <Button variant="outline" size="sm" className="min-h-10">
              Leaderboard
            </Button>
          </Link>
        ) : null}
      </div>

      {/* Divider + identity row */}
      <div className="flex items-center justify-between gap-8 border-t border-plum/10 pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-[4.5rem] sm:w-[4.5rem]",
                ACCENT_BG_SOFT[lab.accent],
                ACCENT_TEXT[lab.accent],
              )}
            >
              <LabIcon id={lab.icon} className="h-9 w-9 sm:h-10 sm:w-10" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-[2.5rem] sm:leading-tight">
                  {lab.name}
                </h1>
                <DifficultyBadge difficulty={lab.difficulty} />
              </div>
              <p className="mt-2 max-w-2xl text-base text-ink-muted">{lab.description}</p>
            </div>
          </div>
        </div>

        <SviglLabsLogo size="md" href={backHref} className="shrink-0" />
      </div>
    </header>
  );
}
