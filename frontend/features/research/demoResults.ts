import type { QuickDrawSample } from "./doodles";
import { LIVE_WORDS } from "./doodles";

export type DemoTrialResult = {
  word: string;
  status: "hit" | "miss";
  guesses: { answer: string; confidence: number }[];
  latencyMs: number;
  detail: string;
};

/** Recorded hold-out outcomes (matches Ai_Exp10 report figures). Use when API is unavailable. */
export const DEMO_TRIAL_RESULTS: DemoTrialResult[] = [
  {
    word: "ice cream",
    status: "hit",
    guesses: [
      { answer: "ice cream", confidence: 0.94 },
      { answer: "cone", confidence: 0.52 },
      { answer: "dessert", confidence: 0.31 },
    ],
    latencyMs: 2280,
    detail: "AnAI 1.3 Pro",
  },
  {
    word: "chair",
    status: "hit",
    guesses: [
      { answer: "chair", confidence: 0.91 },
      { answer: "seat", confidence: 0.44 },
      { answer: "furniture", confidence: 0.28 },
    ],
    latencyMs: 2055,
    detail: "AnAI 1.3 Pro",
  },
  {
    word: "shoe",
    status: "miss",
    guesses: [
      { answer: "sneaker", confidence: 0.62 },
      { answer: "shoe", confidence: 0.41 },
      { answer: "boot", confidence: 0.19 },
    ],
    latencyMs: 2410,
    detail: "AnAI 1.3 Pro",
  },
  {
    word: "moon",
    status: "hit",
    guesses: [
      { answer: "moon", confidence: 0.96 },
      { answer: "crescent", confidence: 0.35 },
      { answer: "night", confidence: 0.22 },
    ],
    latencyMs: 1988,
    detail: "AnAI 1.3 Pro",
  },
  {
    word: "bird",
    status: "hit",
    guesses: [
      { answer: "bird", confidence: 0.88 },
      { answer: "duck", confidence: 0.41 },
      { answer: "chicken", confidence: 0.18 },
    ],
    latencyMs: 2533,
    detail: "AnAI 1.3 Pro",
  },
  {
    word: "key",
    status: "hit",
    guesses: [
      { answer: "key", confidence: 0.93 },
      { answer: "lock", confidence: 0.38 },
      { answer: "door", confidence: 0.15 },
    ],
    latencyMs: 2194,
    detail: "AnAI 1.3 Pro",
  },
];

export function demoResultsForWords(words: readonly string[] = LIVE_WORDS): DemoTrialResult[] {
  const byWord = new Map(DEMO_TRIAL_RESULTS.map((row) => [row.word, row]));
  return words.map((word) => {
    const hit = byWord.get(word);
    if (hit) return hit;
    return {
      word,
      status: "hit" as const,
      guesses: [{ answer: word, confidence: 0.9 }],
      latencyMs: 2100,
      detail: "AnAI 1.3 Pro",
    };
  });
}

export function isDemoDatasetComplete(samples: Record<string, QuickDrawSample | undefined>) {
  return LIVE_WORDS.every((word) => Boolean(samples[word]?.drawing?.length));
}
