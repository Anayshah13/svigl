/**
 * Shared Skribbl-style drawing palettes (manual swatches — no free color picker).
 * Used by `/demo` and the live game drawer whiteboard.
 */

/** Primary row — classic draw-game rainbow + neutrals. */
export const DRAW_COLOR_SHEET_PRIMARY = [
  "#000000",
  "#FFFFFF",
  "#C1C1C1",
  "#EF4444",
  "#F97316",
  "#FCEE09",
  "#22C55E",
  "#3B82F6",
  "#A855F7",
  "#EC4899",
] as const;

/** Extra primary hues — exactly 10, same density as the primary row. */
export const DRAW_COLOR_SHEET_MORE = [
  "#D4A017", // gold
  "#8B4513", // brown
  "#4B5563", // dark gray
  "#166534", // dark green
  "#38BDF8", // light blue
  "#1E3A8A", // dark blue
  "#5B21B6", // dark purple
  "#C4B5FD", // lavender
  "#14B8A6", // teal
  "#F43F5E", // rose
] as const;

export const DRAW_COLOR_SHEETS = [
  DRAW_COLOR_SHEET_PRIMARY,
  DRAW_COLOR_SHEET_MORE,
] as const;
