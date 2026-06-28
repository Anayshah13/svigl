// Drawing document model — see docs/drawing_model.md.

export const CANVAS_VIEWBOX = { width: 800, height: 600 } as const;

export const ColorPalette = [
  "#000000", "#9CA3AF", "#FFFFFF",
  "#EF4444", "#F97316", "#FACC15",
  "#22C55E", "#3B82F6", "#A855F7", "#92400E",
] as const;
export type PaletteColor = (typeof ColorPalette)[number];

export const StrokeWidths = [1, 2, 4, 6, 8, 12] as const;
export type StrokeWidth = (typeof StrokeWidths)[number];

export interface Style {
  strokeColor: string;
  strokeWidth: StrokeWidth;
  fillColor: string | "none";
  opacity: number;
}

export interface RectangleGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleGeometry {
  cx: number;
  cy: number;
  radius: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PathNode {
  id: string;
  position: Point;
  incomingHandle: Point | null;
  outgoingHandle: Point | null;
}

export interface PathGeometry {
  nodes: PathNode[];
}

export type ShapeType = "rectangle" | "circle" | "path";

interface BaseShape<T extends ShapeType, G> {
  id: string;
  type: T;
  geometry: G;
  style: Style;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type RectangleShape = BaseShape<"rectangle", RectangleGeometry>;
export type CircleShape = BaseShape<"circle", CircleGeometry>;
export type PathShape = BaseShape<"path", PathGeometry>;
export type Shape = RectangleShape | CircleShape | PathShape;

export type OperationType = "shape.commit" | "shape.update" | "shape.undo";

export interface Operation {
  id: string;
  type: OperationType;
  playerId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface DrawingDocument {
  id: string;
  version: number;
  createdAt: number;
  operations: Operation[];
  shapes: Shape[];
}

export type DrawingTool = "pointer" | "path" | "rectangle" | "circle";
