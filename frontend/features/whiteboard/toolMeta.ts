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

/**
 * Ordering here is UI order in ToolDock. `pencil` is intentionally first
 * because it is the primary drawing tool and the default when entering the
 * whiteboard — a user can immediately start sketching without switching.
 */
export const TOOL_META: ToolMeta[] = [
  {
    id: "pencil",
    label: "Pencil",
    shortcut: "1",
    tooltip:
      "Drag to draw a freehand stroke. Strokes smooth automatically and integrate with select / undo / multiplayer.",
    hint: "Drag to sketch — pen up commits the stroke.",
  },
  {
    id: "select",
    label: "Selection",
    shortcut: "2",
    tooltip:
      "Click a shape to select and drag. Drag empty space for a selection box; stretch the group box to scale. Double-tap works from any tool.",
    hint: "Click a shape, marquee-select several, then drag group handles to scale.",
  },
  {
    id: "bezier",
    label: "Line",
    shortcut: "3",
    tooltip:
      "Drag to draw a curve/line. Click a committed shape to select it. Adjust the green control after selecting.",
    hint: "Drag to draw a curve/line · click a shape to select · green handle bends it.",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    shortcut: "4",
    tooltip: "Drag to draw. Hold Shift for a square · Alt to skew.",
    hint: "Drag to draw. Shift = square · Alt = skew.",
  },
  {
    id: "ellipse",
    label: "Ellipse",
    shortcut: "5",
    tooltip: "Drag to draw. Hold Shift for a circle · Alt to rotate.",
    hint: "Drag to draw. Shift = circle · Alt = rotate.",
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
];

export const TOOL_BY_ID = Object.fromEntries(
  TOOL_META.map((t) => [t.id, t]),
) as Record<WhiteboardTool, ToolMeta>;

export const TOOL_SHORTCUT_MAP: Record<string, WhiteboardTool> = {
  "1": "pencil",
  "2": "select",
  "3": "bezier",
  "4": "rectangle",
  "5": "ellipse",
  "6": "fill",
  "7": "eraser",
  b: "pencil",
  p: "pencil",
  v: "select",
  e: "eraser",
  x: "eraser",
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
