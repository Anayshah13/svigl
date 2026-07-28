import Link from "next/link";
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
  className,
}: {
  lab: LabConfig;
  backHref?: string;
  backLabel?: string;
  showLeaderboard?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5", className)}>
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-plum"
      >
        <BackArrowIcon />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl",
                ACCENT_BG_SOFT[lab.accent],
                ACCENT_TEXT[lab.accent],
              )}
            >
              <LabIcon id={lab.icon} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-plum">Svigl Labs</p>
              <h1 className="mt-0.5 text-[clamp(1.65rem,5vw,2.25rem)] font-bold tracking-tight text-ink">
                {lab.name}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm text-ink-muted sm:text-base">{lab.description}</p>
          <div className="mt-3">
            <DifficultyBadge difficulty={lab.difficulty} />
          </div>
        </div>

        {showLeaderboard ? (
          <Link href={labLeaderboardPath(lab.slug)} className="shrink-0">
            <Button variant="outline" size="sm">
              Leaderboard
            </Button>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
