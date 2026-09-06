/**
 * Calling policy for the AI Guesser — same rules as the in-game AnAI bot.
 *
 * First look waits out a debounce. After that, a call happens only when the
 * board is dirty. Unchanged ink is never re-sent. No side effects here; the
 * engine owns timers and the network.
 */

import type { AiGuesserConfig } from "./config";

export type SkipReason =
  | "empty"
  | "in-flight"
  | "error-backoff"
  | "unchanged"
  | "debounce"
  | "max-calls";

export type CallReason = "first-look" | "canvas-dirty";

export type DecisionReason = SkipReason | CallReason;

export interface CallDecision {
  call: boolean;
  reason: DecisionReason;
}

export interface CallDecisionInput {
  now: number;
  hasInk: boolean;
  dirty: boolean;
  inFlight: boolean;
  callsThisDrawing: number;
  /** When the first ink of this drawing appeared. */
  turnStartedAt: number | null;
  blockedUntil: number | null;
  config: AiGuesserConfig;
}

export function decideCall(input: CallDecisionInput): CallDecision {
  const {
    now,
    hasInk,
    dirty,
    inFlight,
    callsThisDrawing,
    turnStartedAt,
    blockedUntil,
    config,
  } = input;

  if (!hasInk) {
    return { call: false, reason: "empty" };
  }

  if (inFlight) {
    return { call: false, reason: "in-flight" };
  }

  if (blockedUntil !== null && now < blockedUntil) {
    return { call: false, reason: "error-backoff" };
  }

  if (callsThisDrawing >= config.MAX_CALLS_PER_TURN) {
    return { call: false, reason: "max-calls" };
  }

  if (!dirty) {
    return { call: false, reason: "unchanged" };
  }

  if (callsThisDrawing === 0) {
    const elapsed = turnStartedAt === null ? 0 : now - turnStartedAt;
    if (elapsed < config.DEBOUNCE_MS) {
      return { call: false, reason: "debounce" };
    }
    return { call: true, reason: "first-look" };
  }

  return { call: true, reason: "canvas-dirty" };
}
