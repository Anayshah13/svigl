"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { DotPulseGrid } from "@/features/loaders";
import { cn } from "@/lib/cn";
import { isAbortError } from "@/lib/api";
import { buildSignInUrl } from "@/lib/post-auth-redirect";
import {
  fetchAiGuesserWeek,
  type WeekOverview,
  type WeeklyGameCard,
} from "@/services/ai-guesser";
import { useSessionStore } from "@/stores/session";
import { BestScoreCorner } from "./BestScore";
import {
  GAME_ACCENT_BG,
  GAME_ACCENT_RING,
  GAME_ACCENT_TEXT,
  GameIcon,
  visualForGame,
} from "./GameIcon";
import { formatWeekReset } from "./format";
import {
  aiGuesserFreePlayPath,
  aiGuesserGamePath,
  aiGuesserLeaderboardPath,
  aiGuesserPath,
} from "./week";

function useWeekCountdown(resetsAt: string | null): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!resetsAt) return;
    const tick = () => {
      const left = new Date(resetsAt).getTime() - Date.now();
      if (left <= 0) {
        setLabel("Resetting…");
        return;
      }
      const days = Math.floor(left / 86_400_000);
      const hours = Math.floor((left % 86_400_000) / 3_600_000);
      const minutes = Math.floor((left % 3_600_000) / 60_000);
      setLabel(
        days > 0
          ? `${days}d ${hours}h left`
          : hours > 0
            ? `${hours}h ${minutes}m left`
            : `${minutes}m left`,
      );
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [resetsAt]);
  return label;
}

const rowButtonClass = "h-9 min-h-9 w-full touch-manipulation";

function GameModule({
  game,
  signedIn,
}: {
  game: WeeklyGameCard;
  signedIn: boolean;
}) {
  const visual = visualForGame(game.slug);

  return (
    <motion.article
      title={game.description}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="flex h-full flex-col rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-(--shadow-soft)"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
            GAME_ACCENT_BG[visual.accent],
            GAME_ACCENT_RING[visual.accent],
            GAME_ACCENT_TEXT[visual.accent],
          )}
        >
          <GameIcon id={visual.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.22em] text-plum">
            Game {String(game.index).padStart(2, "0")}
          </p>
          <h2 className="font-display text-lg leading-tight text-ink">{game.title}</h2>
        </div>
        <BestScoreCorner bestMs={game.myBestMs} rank={game.myRank} />
      </div>

      <p className="mt-2 line-clamp-1 text-sm text-ink-muted">{game.description}</p>

      <div className="mt-3 flex gap-2">
        {signedIn ? (
          <Link href={aiGuesserGamePath(game.slug)} className="min-w-0 flex-1 touch-manipulation">
            <Button variant="primary" size="sm" className={rowButtonClass}>
              {game.finished ? "Replay" : "Play"}
            </Button>
          </Link>
        ) : (
          <Link
            href={buildSignInUrl(aiGuesserPath(), "Sign in to start a ranked run.")}
            className="min-w-0 flex-1 touch-manipulation"
          >
            <Button variant="primary" size="sm" className={rowButtonClass}>
              Sign in
            </Button>
          </Link>
        )}
        <Link
          href={aiGuesserLeaderboardPath(game.slug)}
          className="min-w-0 flex-1 touch-manipulation"
        >
          <Button variant="outline" size="sm" className={rowButtonClass}>
            Leaderboard
          </Button>
        </Link>
      </div>
    </motion.article>
  );
}

function FreePlayModule({
  unlocked,
  signedIn,
}: {
  unlocked: boolean;
  signedIn: boolean;
}) {
  const visual = visualForGame("free-play");

  return (
    <motion.article
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "flex h-full flex-col rounded-2xl border p-3.5 shadow-(--shadow-soft)",
        unlocked ? "border-chartreuse/40 bg-[#fcffe8]" : "border-gray-200/80 bg-white/70",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
            unlocked
              ? "bg-[rgba(187,227,49,0.22)] text-ink ring-chartreuse/35"
              : cn(
                  GAME_ACCENT_BG[visual.accent],
                  GAME_ACCENT_RING[visual.accent],
                  GAME_ACCENT_TEXT[visual.accent],
                ),
          )}
        >
          <GameIcon id={visual.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.22em] text-plum">
            Bonus
          </p>
          <h2 className="font-display text-lg leading-tight text-ink">Free Play</h2>
        </div>
      </div>

      <p className="mt-2 line-clamp-1 text-sm text-ink-muted">
        {unlocked
          ? "Unlocked — endless drawings, no clock."
          : "Finish all five weekly games to unlock."}
      </p>

      <div className="mt-3">
        {unlocked && signedIn ? (
          <Link href={aiGuesserFreePlayPath()} className="touch-manipulation">
            <Button variant="chartreuse" size="sm" className={rowButtonClass}>
              Open Free Play
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className={rowButtonClass} disabled>
            {unlocked ? "Sign in" : "Locked"}
          </Button>
        )}
      </div>
    </motion.article>
  );
}

export function AiGuesserHub() {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const [week, setWeek] = useState<WeekOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const countdown = useWeekCountdown(week?.resetsAt ?? null);

  useEffect(() => {
    if (!authReady) return;
    const controller = new AbortController();
    fetchAiGuesserWeek(controller.signal)
      .then(setWeek)
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError("Could not load this week.");
      });
    return () => controller.abort();
  }, [authReady, authUser?.id]);

  return (
    <div className="page-shell page-shell-hub">
      <FadeIn className="shrink-0" y={12}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-plum">
              Weekly time trial
            </p>
            <h1 className="font-display text-[clamp(1.5rem,4vw,2rem)] leading-tight text-ink">
              AI Guesser
            </h1>
            <p className="mt-0.5 truncate text-xs text-ink-muted sm:text-sm">
              Five games. 70 seconds. Fresh words every Monday.
            </p>
          </div>
          {week ? (
            <div className="shrink-0 text-right">
              <p className="font-mono text-base font-semibold text-plum sm:text-lg">
                {countdown || formatWeekReset(week.resetsAt)}
              </p>
              <p className="text-xs text-ink-muted">
                {week.finishedCount}/5 · {week.weekId}
              </p>
            </div>
          ) : null}
        </div>
      </FadeIn>

      {!authReady || (!week && !error) ? (
        <div className="flex flex-1 items-center justify-center">
          <DotPulseGrid size="sm" />
        </div>
      ) : error ? (
        <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-pink/30 bg-pink/5 px-4 text-center text-sm text-ink-muted">
          {error}
        </p>
      ) : (
        <FadeInStagger
          stagger={0.04}
          className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2.5 sm:grid-cols-2"
        >
          {week?.games.map((game) => (
            <FadeInItem key={game.slug} className="min-h-0">
              <GameModule game={game} signedIn={Boolean(authUser)} />
            </FadeInItem>
          ))}
          <FadeInItem className="min-h-0">
            <FreePlayModule
              unlocked={Boolean(week?.freePlayUnlocked)}
              signedIn={Boolean(authUser)}
            />
          </FadeInItem>
        </FadeInStagger>
      )}
    </div>
  );
}
