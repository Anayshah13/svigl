/**
 * One shouted guess per model call — same rule as the in-game AnAI bot.
 *
 * Walk the model's ranked list, skip blanks / repeats / low confidence, and
 * keep the first word that would have been posted to chat.
 */

import type { GuessItem } from "./types";

export function normalizeGuessKey(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pickCommittedGuess(
  incoming: readonly GuessItem[],
  already: Iterable<string>,
  minConfidence: number,
): GuessItem | null {
  const seen = new Set(
    [...already].map(normalizeGuessKey).filter((key) => key.length > 0),
  );

  for (const item of incoming) {
    const key = normalizeGuessKey(item.answer);
    if (!key || seen.has(key)) continue;
    if (!Number.isFinite(item.confidence) || item.confidence < minConfidence) {
      continue;
    }
    return { answer: item.answer, confidence: item.confidence };
  }

  return null;
}
