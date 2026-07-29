/**
 * Word hint display helpers.
 *
 * Server `word_hint` is the authority when it includes revealed letters.
 * Format from `word_hint_mask`: letters/blanks joined with single spaces;
 * a space in the secret becomes an empty join slot → three spaces (`_ _ _   _ _`).
 */

/**
 * Parse server hint into display slots.
 * Letter/blank tokens are `"_"` or revealed letters; word breaks are `" "`.
 */
export function parseHintSlots(hint: string | null | undefined): string[] {
  if (!hint) return [];

  // Split on single spaces so consecutive empties preserve word gaps.
  // "_ _ _"           → ["_", "_", "_"]
  // "_ _ _   _ _"     → ["_", "_", "_", "", "", "_", "_"]  (one word gap)
  // "_   _   _"       → ["_", "", "", "_", "", "", "_"]    (two word gaps)
  const parts = hint.trim().split(" ");
  const slots: string[] = [];
  let emptyRun = 0;

  const flushEmpties = () => {
    if (emptyRun === 0) return;
    // One secret-space → two empty parts after join/split; ceil covers odd runs too.
    const gaps = Math.ceil(emptyRun / 2);
    for (let i = 0; i < gaps; i++) {
      slots.push(" ");
    }
    emptyRun = 0;
  };

  for (const part of parts) {
    if (part === "") {
      emptyRun++;
      continue;
    }
    flushEmpties();
    slots.push(part);
  }
  flushEmpties();
  return slots;
}
