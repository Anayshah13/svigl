/**
 * Shared Skribbl-style drawing palettes (manual swatches — no free color picker).
 * Used by `/demo` and the live game drawer whiteboard.
 */

/** Primary row — neutrals + core rainbow (orange/pink/purple live in More). */
export const DRAW_COLOR_SHEET_PRIMARY = [
  "#000000",
  "#FFFFFF",
  "#C1C1C1",
  "#EF4444",
  "#FCEE09",
  "#22C55E",
  "#3B82F6",
] as const;

/** Extra hues revealed by the More popup. */
export const DRAW_COLOR_SHEET_MORE = [
  "#F97316", // orange
  "#D4A017", // gold
  "#8B4513", // brown
  "#166534", // dark green
  "#38BDF8", // light blue
  "#A855F7", // purple
  "#EC4899", // pink
] as const;

export const DRAW_COLOR_SHEETS = [
  DRAW_COLOR_SHEET_PRIMARY,
  DRAW_COLOR_SHEET_MORE,
] as const;
