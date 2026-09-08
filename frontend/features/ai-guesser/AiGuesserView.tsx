"use client";

import * as React from "react";
import Link from "next/link";
import {
  DRAWER_WHITEBOARD_UI,
  Whiteboard,
  type WhiteboardController,
} from "@/features/whiteboard";
import { Button } from "@/components/ui/Button";
import { isAbortError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { buildSignInUrl } from "@/lib/post-auth-redirect";
import { DotPulseGrid } from "@/features/loaders";
import {
  failAiGuesserPrompt,
  fetchActiveAiGuesserRun,
  startAiGuesserRun,
} from "@/services/ai-guesser";
import { useSessionStore } from "@/stores/session";
import { AiGuessPanel } from "./AiGuessPanel";
import { AiGuesserHud } from "./AiGuesserHud";
import { AiGuesserMobileHeader } from "./AiGuesserMobileHeader";
import { AiGuesserResults } from "./AiGuesserResults";
import { useAiGuesser } from "./useAiGuesser";
import { useAiGuesserVoice } from "./useAiGuesserVoice";
import type { AiGuessMatchState } from "./types";
import { AI_GUESSER_CONFIG } from "./config";
import { aiGuesserGamePath, aiGuesserPath } from "./week";

const HOLD_MS = 2000;

type PromptHold = {
  secret: string;
  callsLeft: number;
  promptIndex: number;
  remainingMs: number;
};

function PromptHandoff({
  missed,
}: {
  missed: boolean;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#fafaf8]/85 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <DotPulseGrid size="sm" />
      <p className="font-display text-lg text-ink">
        {missed ? "Time’s up" : "Next drawing"}
      </p>
    </div>
  );
}

export function AiGuesserView({ gameSlug }: { gameSlug: string }) {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const controllerRef = React.useRef<WhiteboardController | null>(null);
  const resetRef = React.useRef<() => void>(() => {});
  const failingRef = React.useRef(false);
  const holdTimerRef = React.useRef<number | null>(null);

  const [match, setMatch] = React.useState<AiGuessMatchState | null>(null);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [solved, setSolved] = React.useState(false);
  const [missed, setMissed] = React.useState(false);
  const [hold, setHold] = React.useState<PromptHold | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const matchRef = React.useRef<AiGuessMatchState | null>(null);
  const transitioningRef = React.useRef(false);
  matchRef.current = match;

  const applyMatch = React.useCallback((next: AiGuessMatchState) => {
    const current = matchRef.current;
    if (transitioningRef.current) return;

    if (next.promptSolved || next.promptFailed) {
      transitioningRef.current = true;
      const frozen: PromptHold = {
        secret: current?.secret || next.secret,
        callsLeft: current?.callsLeft ?? next.callsLeft,
        promptIndex: current?.promptIndex ?? Math.max(0, next.promptIndex - 1),
        remainingMs: current?.deadlineAt
          ? Math.max(0, new Date(current.deadlineAt).getTime() - Date.now())
          : 0,
      };
      setHold(frozen);
      setSolved(next.promptSolved);
      setMissed(next.promptFailed);
      resetRef.current();
      controllerRef.current?.clear();
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        transitioningRef.current = false;
        resetRef.current();
        setMatch(next);
        setHold(null);
        setSolved(false);
        setMissed(false);
      }, HOLD_MS);
      return;
    }

    setMatch(next);
  }, []);

  const beginRun = React.useCallback(async () => {
    setStarting(true);
    setBootError(null);
    setSolved(false);
    setMissed(false);
    setHold(null);
    transitioningRef.current = false;
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    try {
      const next = await startAiGuesserRun(gameSlug);
      controllerRef.current?.clear();
      resetRef.current();
      setMatch(next);
    } catch (err) {
      setBootError(err instanceof Error ? err.message : "Could not start the game.");
    } finally {
      setStarting(false);
    }
  }, [gameSlug]);

  React.useEffect(() => {
    if (!authReady || !authUser) return;
    let cancelled = false;
    const controller = new AbortController();
    fetchActiveAiGuesserRun(gameSlug, controller.signal)
      .then((active) => {
        if (cancelled) return;
        if (active) setMatch(active);
        else return beginRun();
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted || isAbortError(err)) return;
        setBootError("Could not load the run.");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authReady, authUser, beginRun, gameSlug]);

  React.useEffect(
    () => () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    },
    [],
  );

  const remainingMs = React.useMemo(() => {
    if (!match?.deadlineAt || match.status !== "open") return 0;
    return Math.max(0, new Date(match.deadlineAt).getTime() - now);
  }, [match, now]);

  React.useEffect(() => {
    if (!match || match.status !== "open") return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [match]);

  const { state, onShapesChange, reset, serviceEnabled, ttsEnabled } = useAiGuesser({
    runId: match?.runId ?? null,
    promptIndex: match?.status === "open" ? match.promptIndex : null,
    onMatch: applyMatch,
  });
  resetRef.current = reset;

  React.useEffect(() => {
    if (!match || match.status !== "open" || solved || missed || hold) return;
    if (remainingMs > 0) return;
    // Let an in-flight look finish; the server will fail/solve on apply.
    // Only force-fail when we are idle so we do not abort a useful response.
    if (state.status === "thinking") return;
    if (failingRef.current) return;
    failingRef.current = true;
    failAiGuesserPrompt(match.runId)
      .then(applyMatch)
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        // Run already advanced elsewhere — refresh from active state silently.
      })
      .finally(() => {
        failingRef.current = false;
      });
  }, [applyMatch, hold, match, missed, remainingMs, solved, state.status]);

  const secret = hold?.secret ?? match?.secret ?? "";
  const callsLeft = hold?.callsLeft ?? match?.callsLeft ?? 0;
  const promptIndex = hold?.promptIndex ?? match?.promptIndex ?? 0;
  const clockMs = hold?.remainingMs ?? remainingMs;
  const { muted, speaking, spokenText, toggleMuted, unlock } = useAiGuesserVoice({
    line: hold ? null : state.line,
    guesses: state.guesses,
    solved,
    secret,
    ttsEnabled,
  });

  const clearDrawing = React.useCallback(() => {
    controllerRef.current?.clear();
    reset();
  }, [reset]);

  const hasInk = state.drawingVersion > 0 && state.status !== "idle";
  const promptCount = 5;
  const maxCalls = AI_GUESSER_CONFIG.MAX_CALLS_PER_TURN;

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

  if (authReady && !authUser) {
    return (
      <div className="page-shell items-center justify-center gap-4 py-20 text-center">
        <h1 className="font-display text-3xl text-ink">Sign in to play</h1>
        <p className="max-w-md text-sm text-ink-muted">
          Ranked weekly runs need a Svigl account so your time can land on the board.
        </p>
        <Link href={buildSignInUrl(aiGuesserGamePath(gameSlug))}>
          <Button variant="primary">Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="page-shell items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-ink-muted">
          {bootError ?? (starting ? "Starting your run…" : "Loading this week’s game…")}
        </p>
        {bootError ? (
          <Button variant="primary" size="sm" onClick={() => void beginRun()}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="page-shell page-shell-game page-shell-game-immersive page-shell-game-immersive-lg relative z-10 gap-1.5 overflow-hidden overscroll-none sm:gap-2"
      onPointerDownCapture={unlock}
    >
      {match.status === "finished" ? (
        <AiGuesserResults match={match} onReplay={() => void beginRun()} />
      ) : null}

      <AiGuesserMobileHeader
        className="lg:hidden"
        secret={secret}
        remainingMs={clockMs}
        callsLeft={callsLeft}
        promptIndex={promptIndex}
        promptCount={promptCount}
        solved={solved}
        muted={muted}
        hasInk={hasInk}
        onClear={clearDrawing}
        onToggleMute={toggleMuted}
      />

      <div
        className={cn(
          "grid min-h-0 w-full flex-1 gap-1.5 overflow-hidden sm:gap-2",
          "grid-rows-[minmax(0,1fr)_minmax(9rem,26%)]",
          "max-lg:landscape:grid-cols-[minmax(0,1fr)_minmax(11.5rem,30%)]",
          "max-lg:landscape:grid-rows-1",
          "lg:grid-rows-1",
        )}
      >
        <section className="relative order-1 flex min-h-0 min-w-0 flex-col">
          <Whiteboard
            {...DRAWER_WHITEBOARD_UI}
            isDrawer
            fill
            playerId="ai-guesser"
            controllerRef={controllerRef}
            className="h-full min-h-0 flex-1"
            headerInfo={
              <AiGuesserHud
                secret={secret}
                remainingMs={clockMs}
                callsLeft={callsLeft}
                maxCalls={maxCalls}
                promptIndex={promptIndex}
                promptCount={promptCount}
                solved={solved}
                missed={missed}
              />
            }
            aside={<AiGuessPanel {...panelProps} variant="dock" />}
            onShapesChange={solved || missed || hold ? undefined : onShapesChange}
            onClear={reset}
          />
          {hold ? <PromptHandoff missed={missed} /> : null}
        </section>

        <div className="order-2 min-h-0 overflow-hidden pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] max-lg:landscape:order-2 lg:hidden lg:pb-0">
          <AiGuessPanel {...panelProps} variant="strip" />
        </div>
      </div>

      <Link
        href={aiGuesserPath()}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white focus:px-3 focus:py-2"
      >
        Weekly games
      </Link>
    </div>
  );
}
