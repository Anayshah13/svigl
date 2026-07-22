import type { WhiteboardTool } from "./types";

export interface ToolMeta {
  id: WhiteboardTool;
  label: string;
  shortcut: string;
  /** Short tooltip teaching drag / modifiers. */
  tooltip: string;
  /** One-line hint for properties panel when tool is active. */
  hint: string;
}

export const TOOL_META: ToolMeta[] = [
  {
    id: "select",
    label: "Selection",
    shortcut: "1",
    tooltip:
      "Click a shape to select and drag. Drag empty space for a selection box; stretch the group box to scale. Double-tap works from any tool.",
    hint: "Click a shape, marquee-select several, then drag group handles to scale.",
  },
  {
    id: "bezier",
    label: "Line",
    shortcut: "2",
    tooltip:
      "Drag to draw a curve/line. Click a committed shape to select it. Adjust the green control after selecting.",
    hint: "Drag to draw a curve/line · click a shape to select · green handle bends it.",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    shortcut: "3",
    tooltip: "Drag to draw. Hold Shift for a square · Alt to skew.",
    hint: "Drag to draw. Shift = square · Alt = skew.",
  },
  {
    id: "ellipse",
    label: "Ellipse",
    shortcut: "4",
    tooltip: "Drag to draw. Hold Shift for a circle · Alt to rotate.",
    hint: "Drag to draw. Shift = circle · Alt = rotate.",
  },
  {
    id: "arrow",
    label: "Arrow",
    shortcut: "5",
    tooltip: "Drag from start to tip to place an arrow.",
    hint: "Drag from start point to the arrow tip.",
  },
  {
    id: "fill",
    label: "Fill",
    shortcut: "6",
    tooltip: "Click a closed region to flood-fill.",
    hint: "Click inside a region to fill.",
  },
  {
    id: "eraser",
    label: "Eraser",
    shortcut: "7",
    tooltip: "Tap or drag over shapes to remove them (shape eraser).",
    hint: "Tap or drag across shapes to erase them.",
  },
  {
    id: "hand",
    label: "Hand",
    shortcut: "8",
    tooltip: "Drag to pan the canvas. Also: hold Space while dragging.",
    hint: "Drag to pan · Space+drag also pans · Ctrl+wheel zooms.",
  },
];

export const TOOL_BY_ID = Object.fromEntries(
  TOOL_META.map((t) => [t.id, t]),
) as Record<WhiteboardTool, ToolMeta>;

export const TOOL_SHORTCUT_MAP: Record<string, WhiteboardTool> = {
  "1": "select",
  "2": "bezier",
  "3": "rectangle",
  "4": "ellipse",
  "5": "arrow",
  "6": "fill",
  "7": "eraser",
  "8": "hand",
  v: "select",
  e: "eraser",
  x: "eraser",
  h: "hand",
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as HTMLElement;
  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest === "function") {
    return Boolean(el.closest("[contenteditable='true']"));
  }
  return false;
}
