/**
 * Pure calling policy for the AI Guesser.
 *
 * Given the current drawing signature and timing state, decide whether one
 * more AI call is justified. No side effects, no timers, no network — the
 * engine owns those so this stays exhaustively testable.
 */

import { changeScore, isEmptySignature } from "./changeDetector";
import type { AiGuesserConfig } from "./config";
import type { DrawingSignature } from "./types";

export type SkipReason =
  | "empty"
  | "in-flight"
  | "error-backoff"
  | "unchanged"
  | "cooldown"
  | "below-threshold";

export type CallReason =
  | "significant-change"
  | "target-cadence"
  | "settled"
  | "idle-refresh";

export type DecisionReason = SkipReason | CallReason;

export interface CallDecision {
  call: boolean;
  reason: DecisionReason;
  /** Change score against the signature the model last actually saw. */
  score: number;
}

export interface CallDecisionInput {
  now: number;
  /** Newest drawing signature. */
  signature: DrawingSignature;
  /** Signature of the snapshot sent on the most recent call, if any. */
  lastSentSignature: DrawingSignature | null;
  /** When the most recent call *started* (not finished). */
  lastCallStartedAt: number | null;
  inFlight: boolean;
  /** Last time the drawing mutated at all. */
  lastDrawActivityAt: number | null;
  /** Set after a failure; blocks calls until it passes. */
  blockedUntil: number | null;
  config: AiGuesserConfig;
}

export function decideCall(input: CallDecisionInput): CallDecision {
  const {
    now,
    signature,
    lastSentSignature,
    lastCallStartedAt,
    inFlight,
    lastDrawActivityAt,
    blockedUntil,
    config,
  } = input;

  if (isEmptySignature(signature)) {
    return { call: false, reason: "empty", score: 0 };
  }

  // Single-flight: one request at a time, no exceptions.
  if (inFlight) {
    return { call: false, reason: "in-flight", score: 0 };
  }

  if (blockedUntil !== null && now < blockedUntil) {
    return { call: false, reason: "error-backoff", score: 0 };
  }

  const score = changeScore(lastSentSignature, signature, config);
  if (score <= 0) {
    return { call: false, reason: "unchanged", score: 0 };
  }

  const elapsed = lastCallStartedAt === null ? null : now - lastCallStartedAt;

  if (elapsed !== null && elapsed < config.MIN_CALL_INTERVAL_MS) {
    return { call: false, reason: "cooldown", score };
  }

  // A big new chunk of drawing earns an early look (floor already cleared).
  if (score >= config.SIGNIFICANT_CHANGE_SCORE) {
    return { call: true, reason: "significant-change", score };
  }

  if (score >= config.MIN_CHANGE_SCORE) {
    if (elapsed === null || elapsed >= config.TARGET_CALL_INTERVAL_MS) {
      return { call: true, reason: "target-cadence", score };
    }
    // Player paused: analyze the settled drawing rather than waiting out
    // the full target interval.
    const quietFor =
      lastDrawActivityAt === null ? null : now - lastDrawActivityAt;
    if (quietFor !== null && quietFor >= config.IDLE_SETTLE_MS) {
      return { call: true, reason: "settled", score };
    }
  }

  // Only a trickle of change, but the panel has been cold for a while.
  if (
    elapsed !== null &&
    elapsed >= config.MAX_IDLE_INTERVAL_MS &&
    score >= config.TINY_CHANGE_SCORE
  ) {
    return { call: true, reason: "idle-refresh", score };
  }

  return { call: false, reason: "below-threshold", score };
}
