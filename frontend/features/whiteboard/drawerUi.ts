import type { WhiteboardProps } from "./Whiteboard";
import { DRAW_COLOR_SHEETS } from "./drawPalette";

/**
 * Drawer whiteboard chrome shared by `/demo` and live `GameWhiteboard`.
 * Keep these in sync — do not fork flags per route.
 */
export const DRAWER_WHITEBOARD_UI = {
  preferDraw: true,
  showActionBar: true,
  showProperties: false,
  showOnboarding: false,
  showColorPicker: false,
  colorSheets: DRAW_COLOR_SHEETS,
  bezierAsLine: true,
} as const satisfies Partial<WhiteboardProps>;
