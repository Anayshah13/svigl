/**
 * Word hint display helpers.
 *
 * Server `word_hint` is the authority when it includes revealed letters.
 * When the mask is still all underscores, we progressively "open" slots over
 * the round (Skribbl-like cadence) without inventing letter characters —
 * letters only appear once the server hint includes them.
 */

export function parseHintSlots(hint: string | null | undefined): string[] {
  if (!hint) return [];
  // Server format: "_ _ _   _ _ _" — spaces separate slots; double space = word gap.
  return hint.trim().split(/\s+/);
}

export function buildMaskFromLength(length: number): string {
  if (length <= 0) return "";
  return Array.from({ length }, () => "_").join(" ");
}

/**
 * How many letter slots should be revealed by elapsed round progress.
 * Targets ~half the unique slots by ~80% of the round (Skribbl-ish).
 */
export function revealSlotCount(
  slotCount: number,
  progress01: number,
): number {
  if (slotCount <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, progress01));
  const target = Math.floor(slotCount * 0.45 * Math.pow(clamped, 1.35));
  return Math.min(slotCount, Math.max(0, target));
}

/** Deterministic slot indices to open (same for every client). */
export function revealIndices(
  slotCount: number,
  revealCount: number,
  seed: string,
): Set<number> {
  const indices = Array.from({ length: slotCount }, (_, i) => i);
  // Simple deterministic shuffle from seed.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = indices.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return new Set(indices.slice(0, revealCount));
}

export function roundProgress(
  phaseEndsAt: string | null | undefined,
  durationSeconds: number,
  remainingSeconds: number | null | undefined,
): number {
  if (durationSeconds <= 0) return 0;
  if (typeof remainingSeconds === "number" && Number.isFinite(remainingSeconds)) {
    return 1 - Math.max(0, Math.min(1, remainingSeconds / durationSeconds));
  }
  if (!phaseEndsAt) return 0;
  const end = Date.parse(phaseEndsAt);
  if (Number.isNaN(end)) return 0;
  const start = end - durationSeconds * 1000;
  const now = Date.now();
  return Math.max(0, Math.min(1, (now - start) / (durationSeconds * 1000)));
}

/**
 * Merge server hint characters with timed slot openings.
 * Opened slots without a server letter stay as "_" (no invented letters).
 */
export function displaySlots(options: {
  wordHint: string | null;
  wordLength: number | null;
  secretWord: string | null;
  isDrawer: boolean;
  phaseEndsAt: string | null;
  durationSeconds: number;
  remainingSeconds: number | null;
  seed: string;
}): string[] {
  if (options.isDrawer && options.secretWord) {
    return options.secretWord.split("").map((ch) => (ch === " " ? " " : ch));
  }
  // Drawer must never render guesser dashes when secret is missing.
  if (options.isDrawer) {
    return [];
  }

  let slots = parseHintSlots(options.wordHint);
  if (slots.length === 0 && options.wordLength) {
    slots = Array.from({ length: options.wordLength }, () => "_");
  }
  if (slots.length === 0) return [];

  const hasServerLetters = slots.some((s) => s !== "_");
  if (hasServerLetters) {
    return slots;
  }

  const progress = roundProgress(
    options.phaseEndsAt,
    options.durationSeconds,
    options.remainingSeconds,
  );
  const count = revealSlotCount(slots.length, progress);
  const open = revealIndices(slots.length, count, options.seed);
  // Without server letters we only soften styling via open set in the UI;
  // characters remain underscores.
  return slots.map((slot, index) => (open.has(index) ? slot : slot));
}
