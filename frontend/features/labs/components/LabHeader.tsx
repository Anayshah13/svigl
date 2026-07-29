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
  /** Mobile play chrome: back + title + leaderboard in one row. */
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 sm:gap-3",
          className,
        )}
      >
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
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              ACCENT_BG_SOFT[lab.accent],
              ACCENT_TEXT[lab.accent],
            )}
          >
            <LabIcon id={lab.icon} className="h-5 w-5" />
          </div>
          <h1 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
            {lab.name}
          </h1>
        </div>

        {showLeaderboard ? (
          <Link href={labLeaderboardPath(lab.slug)} className="shrink-0 touch-manipulation">
            <Button variant="outline" size="sm" className="min-h-11 touch-manipulation sm:min-h-9">
              Leaderboard
            </Button>
          </Link>
        ) : null}
      </header>
    );
  }

  return (
    <header className={cn("flex flex-col gap-6 sm:gap-7", className)}>
      <Link
        href={backHref}
        className="inline-flex min-h-11 w-fit touch-manipulation items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-plum sm:min-h-0"
      >
        <BackArrowIcon />
        {backLabel}
      </Link>

      <SviglLabsLogo size="md" />

      <div className="flex flex-col gap-4 border-t border-plum/10 pt-5 sm:flex-row sm:items-start sm:justify-between sm:pt-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14",
                ACCENT_BG_SOFT[lab.accent],
                ACCENT_TEXT[lab.accent],
              )}
            >
              <LabIcon id={lab.icon} className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h1 className="text-[clamp(1.75rem,5.5vw,2.5rem)] font-bold tracking-tight text-ink">
              {lab.name}
            </h1>
          </div>
          <p className="mt-3 max-w-xl text-sm text-ink-muted sm:mt-3.5 sm:text-base">
            {lab.description}
          </p>
          <div className="mt-3.5">
            <DifficultyBadge difficulty={lab.difficulty} />
          </div>
        </div>

        {showLeaderboard ? (
          <Link href={labLeaderboardPath(lab.slug)} className="shrink-0 touch-manipulation">
            <Button variant="outline" size="sm" className="min-h-11 touch-manipulation sm:min-h-9">
              Leaderboard
            </Button>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
