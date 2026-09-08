"use client";

import * as React from "react";
import type { WhiteboardShape } from "@/features/whiteboard/types";
import { isAbortError } from "@/lib/api";
import { fetchAiGuesserConfig, requestAiGuess } from "@/services/ai-guesser";
import { AI_GUESSER_CONFIG, type AiGuesserConfig } from "./config";
import { AiGuesserEngine } from "./engine";
import { renderDrawingSnapshot } from "./snapshot";
import {
  createInitialState,
  type AiGuessMatchState,
  type AiGuesserState,
  type AnalyzeInput,
  type AnalyzeResult,
  type CandidateMode,
  type GuessItem,
} from "./types";

const IS_DEV = process.env.NODE_ENV !== "production";

function devLog(fields: Record<string, unknown>): void {
  if (!IS_DEV) return;
  const parts = Object.entries(fields)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
  console.debug(`[AI Guesser] ${parts}`);
}

/**
 * Adds a client-side deadline on top of the engine's abort signal.
 *
 * A timeout must surface as a real failure (so the panel shows unavailable and
 * the engine backs off), whereas an engine-initiated abort — reset or unmount —
 * must stay silent. We therefore rethrow timeouts as a plain Error.
 */
async function analyzeWithTimeout(
  input: AnalyzeInput,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<AnalyzeResult> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();

  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", forwardAbort, { once: true });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await requestAiGuess(input, controller.signal);
  } catch (error) {
    // Engine abort (reset/unmount) wins over a timer that fired in the same tick.
    if (timedOut && !signal.aborted) throw new Error("AI guesser timed out");
    if (signal.aborted) {
      throw isAbortError(error)
        ? error
        : new DOMException("The operation was aborted.", "AbortError");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", forwardAbort);
  }
}

export interface UseAiGuesserOptions {
  initialMode?: CandidateMode;
  config?: Partial<AiGuesserConfig>;
  onAcceptedGuesses?: (guesses: GuessItem[]) => void;
  onMatch?: (match: AiGuessMatchState) => void;
  runId?: string | null;
  promptIndex?: number | null;
}

export interface UseAiGuesserResult {
  state: AiGuesserState;
  mode: CandidateMode;
  setMode: (mode: CandidateMode) => void;
  /** Pass straight to `<Whiteboard onShapesChange={...} />`. */
  onShapesChange: (shapes: WhiteboardShape[]) => void;
  /** New drawing: clears guesses and per-drawing counters. */
  reset: () => void;
  /** Also zeroes the session call counter. */
  resetSession: () => void;
  config: AiGuesserConfig;
  /** Null while probing the backend. */
  serviceEnabled: boolean | null;
  ttsEnabled: boolean;
  model: string | null;
}

export function useAiGuesser(
  options: UseAiGuesserOptions,
): UseAiGuesserResult {
  const {
    initialMode = "game",
    config: configOverrides,
    onAcceptedGuesses,
    onMatch,
    runId = null,
    promptIndex = null,
  } = options;

  const onAcceptedRef = React.useRef(onAcceptedGuesses);
  onAcceptedRef.current = onAcceptedGuesses;
  const onMatchRef = React.useRef(onMatch);
  onMatchRef.current = onMatch;
  const runIdRef = React.useRef(runId);
  runIdRef.current = runId;
  const promptIndexRef = React.useRef(promptIndex);
  promptIndexRef.current = promptIndex;

  const [state, setState] = React.useState<AiGuesserState>(createInitialState);
  const [mode, setModeState] = React.useState<CandidateMode>(initialMode);
  const [serviceEnabled, setServiceEnabled] = React.useState<boolean | null>(
    null,
  );
  const [serviceModel, setServiceModel] = React.useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = React.useState(false);

  const config = React.useMemo<AiGuesserConfig>(
    () =>
      configOverrides
        ? { ...AI_GUESSER_CONFIG, ...configOverrides }
        : AI_GUESSER_CONFIG,
    [configOverrides],
  );

  const engineRef = React.useRef<AiGuesserEngine | null>(null);

  // One engine per mount. Timers and in-flight requests are torn down on unmount.
  React.useEffect(() => {
    const engine = new AiGuesserEngine({
      renderSnapshot: renderDrawingSnapshot,
      analyze: async (input, signal) => {
        const result = await analyzeWithTimeout(
          {
            ...input,
            runId: runIdRef.current,
            promptIndex: promptIndexRef.current,
          },
          signal,
          config.REQUEST_TIMEOUT_MS,
        );
        if (result.match) onMatchRef.current?.(result.match);
        return result;
      },
      onState: setState,
      config: configOverrides,
      logger: IS_DEV ? devLog : undefined,
      mode: initialMode,
      onAcceptedGuesses: (guesses) => onAcceptedRef.current?.(guesses),
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Engine lifetime is intentionally tied to the mount, not to prop churn;
    // mode is pushed in via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    engineRef.current?.setMode(mode);
  }, [mode]);

  // Availability probe: avoids firing snapshots at a server with no API key.
  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchAiGuesserConfig(controller.signal)
      .then((info) => {
        if (!active) return;
        setServiceEnabled(info.enabled);
        setServiceModel(info.model);
        setTtsEnabled(info.ttsEnabled);
      })
      .catch(() => {
        if (!active) return;
        // Probe failure is not fatal — let real calls report the truth.
        setServiceEnabled(true);
        setTtsEnabled(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const onShapesChange = React.useCallback((shapes: WhiteboardShape[]) => {
    engineRef.current?.setShapes(shapes);
  }, []);

  const reset = React.useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const resetSession = React.useCallback(() => {
    engineRef.current?.reset({ resetSession: true });
  }, []);

  const setMode = React.useCallback((next: CandidateMode) => {
    setModeState(next);
  }, []);

  return {
    state,
    mode,
    setMode,
    onShapesChange,
    reset,
    resetSession,
    config,
    serviceEnabled,
    ttsEnabled,
    model: state.model ?? serviceModel,
  };
}
