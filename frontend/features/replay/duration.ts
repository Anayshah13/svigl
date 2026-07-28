/**
 * Hover playback timing — not real-time replay.
 *
 * Original event timestamps are ignored for gallery UX. Actions play in order
 * over a short window that scales with how many ops were recorded:
 *   1 action  → 1s
 *   many ops  → up to 5s
 */

import type { ReplayEvent } from "./types";

export const HOVER_DURATION_MIN_MS = 1000;
export const HOVER_DURATION_MAX_MS = 5000;
/** Event count at which duration reaches the max. */
const FULL_DURATION_AT_EVENTS = 30;

/** Wall-clock length for a hover reveal given action count. */
export function hoverPlaybackDurationMs(eventCount: number): number {
  if (eventCount <= 0) return 0;
  if (eventCount === 1) return HOVER_DURATION_MIN_MS;
  const t =
    ((eventCount - 1) / (FULL_DURATION_AT_EVENTS - 1)) *
    (HOVER_DURATION_MAX_MS - HOVER_DURATION_MIN_MS);
  return Math.round(
    Math.min(
      HOVER_DURATION_MAX_MS,
      HOVER_DURATION_MIN_MS + Math.max(0, t),
    ),
  );
}

/**
 * Remap events to evenly spaced times within the hover window.
 * Preserves order; drops original wall-clock pacing.
 */
export function remapEventsForHover(
  events: readonly ReplayEvent[],
): ReplayEvent[] {
  if (events.length === 0) return [];
  const sorted = events.slice().sort((a, b) => a.t - b.t || 0);
  const duration = hoverPlaybackDurationMs(sorted.length);
  if (sorted.length === 1) {
    return [{ ...sorted[0]!, t: 0 }];
  }
  const last = sorted.length - 1;
  return sorted.map((event, i) => ({
    ...event,
    t: Math.round((i / last) * duration),
  }));
}
