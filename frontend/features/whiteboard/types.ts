/** Structured SVG whiteboard model for Skribbl-style multiplayer. */

/** Square logical board — same aspect on phone, tablet, and laptop. */
export const WHITEBOARD_VIEWBOX = { width: 800, height: 800 } as const;

/** Fallback swatches when no `colorSheets` are passed (matches draw palette primary). */
export const PRESET_COLORS = [
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

export const STROKE_WIDTHS = [2, 5, 10] as const;
export type StrokeWidth = (typeof STROKE_WIDTHS)[number];

/** Default snap grid size in board units (logical SVG coords). */
export const GRID_SIZE = 16;

/** Which color slot the palette currently edits. */
export type ColorTarget = "stroke" | "fill";

/** Drawing / editing tools. Interaction-only tools are never stored on shapes. */
export type WhiteboardTool =
  | "select"
  | "hand"
  | "bezier"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "fill"
  | "eraser";

/** Tools that may appear on persisted shapes. */
export type DrawingTool = Exclude<WhiteboardTool, "select" | "hand" | "eraser">;

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
  /** Ephemeral geometry while creating or editing; never persisted by the server. */
  onShapePreview?: (shape: WhiteboardShape) => void;
  /** Remove an abandoned ephemeral creation from remote canvases. */
  onShapePreviewCancelled?: (shapeId: string) => void;
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
