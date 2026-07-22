/** Structured SVG whiteboard model for Skribbl-style multiplayer. */

/** Square logical board — same aspect on phone, tablet, and laptop. */
export const WHITEBOARD_VIEWBOX = { width: 800, height: 800 } as const;

export const PRESET_COLORS = [
  "#2C2C2C",
  "#FFFFFF",
  "#ED7FB8",
  "#10865C",
  "#703F93",
  "#BBE331",
  "#EF4444",
  "#3B82F6",
] as const;

export const STROKE_WIDTHS = [2, 5, 10] as const;
export type StrokeWidth = (typeof STROKE_WIDTHS)[number];

/** Drawing / editing tools. `"select"` is interaction-only (never stored on shapes). */
export type WhiteboardTool =
  | "select"
  | "bezier"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "fill";

export type DrawingTool = Exclude<WhiteboardTool, "select">;

export interface Point {
  x: number;
  y: number;
}

export interface BezierGeometry {
  kind: "bezier";
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
}

export interface RectGeometry {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseGeometry {
  kind: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ArrowGeometry {
  kind: "arrow";
  start: Point;
  end: Point;
}

/** Flood-fill result stored as a closed path (d attribute). */
export interface FillGeometry {
  kind: "fill";
  d: string;
}

export type ShapeGeometry =
  | BezierGeometry
  | RectGeometry
  | EllipseGeometry
  | ArrowGeometry
  | FillGeometry;

export interface WhiteboardShape {
  id: string;
  tool: DrawingTool;
  stroke: string;
  fill: string | "none";
  strokeWidth: number;
  /** SVG transform attribute (rotate / skew / translate). */
  transform: string;
  geometry: ShapeGeometry;
  createdBy: string;
  createdAt: number;
}

export const PASTE_OFFSET = { x: 16, y: 16 } as const;
export const NUDGE_SMALL = 1;
export const NUDGE_LARGE = 10;

export type HistoryOp =
  | { type: "add"; shape: WhiteboardShape }
  | { type: "remove"; shape: WhiteboardShape; index: number }
  | { type: "update"; before: WhiteboardShape; after: WhiteboardShape }
  | { type: "clear"; shapes: WhiteboardShape[] }
  | { type: "replace"; before: WhiteboardShape[]; after: WhiteboardShape[] };

export interface WhiteboardSyncCallbacks {
  onShapeCreated?: (shape: WhiteboardShape) => void;
  onShapeUpdated?: (shape: WhiteboardShape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  onClear?: () => void;
  onUndo?: (op: HistoryOp) => void;
  onRedo?: (op: HistoryOp) => void;
  /** Throttled full snapshot for sync (~30fps / configurable). */
  onShapesChange?: (shapes: WhiteboardShape[]) => void;
}

export interface WhiteboardExport {
  version: 1;
  viewBox: typeof WHITEBOARD_VIEWBOX;
  shapes: WhiteboardShape[];
  exportedAt: number;
}
