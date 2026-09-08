"use client";

import * as React from "react";
import Link from "next/link";
import {
  DRAWER_WHITEBOARD_UI,
  Whiteboard,
  type WhiteboardController,
} from "@/features/whiteboard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { fetchAiGuesserWeek, fetchFreePlayWord } from "@/services/ai-guesser";
import { useSessionStore } from "@/stores/session";
import { AiGuessPanel } from "./AiGuessPanel";
import { useAiGuesser } from "./useAiGuesser";
import { useAiGuesserVoice } from "./useAiGuesserVoice";
import type { GuessItem } from "./types";
import { guessesMatchSecret } from "./words";
import { aiGuesserPath } from "./week";

const HOLD_MS = 2200;

export function AiGuesserFreePlay() {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const controllerRef = React.useRef<WhiteboardController | null>(null);
  const resetRef = React.useRef<() => void>(() => {});
  const advancingRef = React.useRef(false);

  const [secret, setSecret] = React.useState("");
  const [unlocked, setUnlocked] = React.useState<boolean | null>(null);
  const [solved, setSolved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const secretRef = React.useRef(secret);
  secretRef.current = secret;

  const loadWord = React.useCallback(async (exclude?: string) => {
    const next = await fetchFreePlayWord(exclude);
    setSecret(next);
    setSolved(false);
  }, []);

  React.useEffect(() => {
    if (!authReady || !authUser) return;
    const controller = new AbortController();
    fetchAiGuesserWeek(controller.signal)
      .then((week) => {
        setUnlocked(week.freePlayUnlocked);
        if (week.freePlayUnlocked) return loadWord();
        return undefined;
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not open Free Play.");
      });
    return () => controller.abort();
  }, [authReady, authUser, loadWord]);

  const beginNext = React.useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setSolved(true);
    window.setTimeout(() => {
      controllerRef.current?.clear();
      resetRef.current();
      void loadWord(secretRef.current).finally(() => {
        advancingRef.current = false;
      });
    }, HOLD_MS);
  }, [loadWord]);

  const onAcceptedGuesses = React.useCallback(
    (guesses: GuessItem[]) => {
      if (guessesMatchSecret(guesses, secretRef.current)) beginNext();
    },
    [beginNext],
  );

  const { state, onShapesChange, reset, serviceEnabled, ttsEnabled } = useAiGuesser({
    onAcceptedGuesses,
  });
  resetRef.current = reset;

  const { muted, speaking, spokenText, toggleMuted, unlock } = useAiGuesserVoice({
    line: state.line,
    guesses: state.guesses,
    solved,
    secret,
    ttsEnabled,
  });

  if (authReady && (!authUser || unlocked === false)) {
    return (
      <div className="page-shell items-center justify-center gap-4 py-20 text-center">
        <h1 className="font-display text-3xl text-ink">Free Play is locked</h1>
        <p className="max-w-md text-sm text-ink-muted">
          Finish all five weekly games first. Then you get an endless list of
          tougher everyday words — no clock, no leaderboard.
        </p>
        <Link href={aiGuesserPath()}>
          <Button variant="primary">Back to weekly games</Button>
        </Link>
      </div>
    );
  }

  if (!secret) {
    return (
      <div className="page-shell items-center justify-center py-20 text-sm text-ink-muted">
        {error ?? "Opening Free Play…"}
      </div>
    );
  }

  const panelProps = {
    state,
    secret,
    solved,
    serviceEnabled,
    muted,
    speaking,
    spokenText,
    onToggleMute: toggleMuted,
  };

  return (
    <div
      className="page-shell page-shell-game page-shell-game-immersive page-shell-game-immersive-lg relative z-10 gap-1.5 overflow-hidden sm:gap-2"
      onPointerDownCapture={unlock}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-plum/15 bg-white/90 px-3 py-2">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-plum">
            Free Play
          </p>
          <p className="font-mono text-xl font-bold uppercase tracking-[0.12em] text-ink">
            {secret}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              controllerRef.current?.clear();
              reset();
              void loadWord(secret);
            }}
          >
            Skip
          </Button>
          <Link href={aiGuesserPath()}>
            <Button variant="ghost" size="sm">
              Weekly
            </Button>
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 w-full flex-1 gap-1.5 overflow-hidden",
          "grid-rows-[minmax(0,1fr)_minmax(7.5rem,24%)]",
          "lg:grid-rows-1",
        )}
      >
        <Whiteboard
          {...DRAWER_WHITEBOARD_UI}
          isDrawer
          fill
          playerId="ai-guesser-free"
          controllerRef={controllerRef}
          className="h-full min-h-0"
          aside={<AiGuessPanel {...panelProps} variant="dock" />}
          onShapesChange={onShapesChange}
          onClear={reset}
        />
        <div className="min-h-0 overflow-hidden lg:hidden">
          <AiGuessPanel {...panelProps} variant="strip" />
        </div>
      </div>
    </div>
  );
}
