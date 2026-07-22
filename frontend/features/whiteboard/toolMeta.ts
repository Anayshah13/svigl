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
    shortcut: "V",
    tooltip:
      "Click a shape to select and drag. Double-tap works from any tool. Long-press on mobile for the menu.",
    hint: "Click a shape, then drag or use handles to edit.",
  },
  {
    id: "bezier",
    label: "Curve",
    shortcut: "B",
    tooltip:
      "Drag to place a curve, then adjust the green control handles. Enter commits · Esc cancels.",
    hint: "Drag to draw a curve, then tweak handles. Enter to commit.",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    shortcut: "R",
    tooltip: "Drag to draw. Hold Shift for a square · Alt to skew.",
    hint: "Drag to draw. Shift = square · Alt = skew.",
  },
  {
    id: "ellipse",
    label: "Ellipse",
    shortcut: "E",
    tooltip: "Drag to draw. Hold Shift for a circle · Alt to rotate.",
    hint: "Drag to draw. Shift = circle · Alt = rotate.",
  },
  {
    id: "arrow",
    label: "Arrow",
    shortcut: "A",
    tooltip: "Drag from start to tip to place an arrow.",
    hint: "Drag from start point to the arrow tip.",
  },
  {
    id: "fill",
    label: "Fill",
    shortcut: "F",
    tooltip: "Click a closed region to flood-fill. Adjust tolerance below.",
    hint: "Click inside a region to fill. Tune tolerance if needed.",
  },
];

export const TOOL_BY_ID = Object.fromEntries(
  TOOL_META.map((t) => [t.id, t]),
) as Record<WhiteboardTool, ToolMeta>;

export const TOOL_SHORTCUT_MAP: Record<string, WhiteboardTool> = {
  v: "select",
  b: "bezier",
  r: "rectangle",
  e: "ellipse",
  a: "arrow",
  f: "fill",
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
