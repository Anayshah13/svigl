/**
 * Word hint display helpers.
 *
 * Server `word_hint` is the authority when it includes revealed letters.
 */

export function parseHintSlots(hint: string | null | undefined): string[] {
  if (!hint) return [];
  // Server format: "_ _ _   _ _ _" — spaces separate slots; double space = word gap.
  return hint.trim().split(/\s+/);
}
