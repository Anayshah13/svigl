/**
 * Guess-state smoothing.
 *
 * Raw per-call output flickers: a stroke lands, the leader swaps, then swaps
 * back. An exponential moving average per answer makes the panel read like a
 * human guesser gaining confidence, while answers the model drops fade out
 * instead of vanishing on a single bad frame.
 */

import type { AiGuesserConfig } from "./config";
import type { GuessItem } from "./types";

export function smoothGuesses(
  previous: GuessItem[],
  incoming: GuessItem[],
  config: AiGuesserConfig,
): GuessItem[] {
  const prevByKey = new Map<string, GuessItem>();
  for (const item of previous) {
    prevByKey.set(item.answer.toLowerCase(), item);
  }

  const merged = new Map<string, GuessItem>();

  for (const item of incoming) {
    const key = item.answer.toLowerCase();
    const prior = prevByKey.get(key);
    const confidence =
      prior === undefined
        ? item.confidence
        : prior.confidence +
          (item.confidence - prior.confidence) * config.SMOOTHING_ALPHA;
    // Prefer the newest spelling the model used.
    merged.set(key, { answer: item.answer, confidence });
    prevByKey.delete(key);
  }

  // Unreported answers decay rather than disappearing instantly.
  for (const [key, item] of prevByKey) {
    const decayed = item.confidence * config.SMOOTHING_DECAY;
    if (decayed >= config.SMOOTHING_MIN_KEEP) {
      merged.set(key, { answer: item.answer, confidence: decayed });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, config.MAX_GUESSES)
    .map((item) => ({
      answer: item.answer,
      confidence: Math.min(1, Math.max(0, item.confidence)),
    }));
}

/**
 * True when the panel should present doubt instead of a confident answer:
 * either nothing is leading clearly or the top two are effectively tied.
 */
export function isUncertain(
  guesses: GuessItem[],
  config: AiGuesserConfig,
): boolean {
  if (guesses.length === 0) return true;
  const [top, second] = guesses;
  if (top.confidence < config.UNCERTAIN_CEILING) return true;
  if (second && top.confidence - second.confidence < config.UNCERTAIN_MARGIN) {
    return true;
  }
  return false;
}
