/**
 * Svigl SVG Whiteboard — structured shape list (never a flattened SVG string).
 *
 * Production wiring lives in `features/room/game/GameWhiteboard.tsx`, which
 * mounts `<Whiteboard />` and bridges ops through `createCanvasSyncClient`
 * + `appWebSocket` canvas events.
 */

export { Whiteboard } from "./Whiteboard";
export type { WhiteboardProps } from "./Whiteboard";

export { WhiteboardCanvas } from "./WhiteboardCanvas";
export { SquareBoard } from "./SquareBoard";
export { WhiteboardToolbar } from "./WhiteboardToolbar";
export { ToolDock } from "./ToolDock";
export { StyleDock } from "./StyleDock";
export { ActionBar } from "./ActionBar";
export { PropertiesPanel } from "./PropertiesPanel";
export { ContextMenu } from "./ContextMenu";
export { DrawerOnboarding, useDrawerOnboarding } from "./DrawerOnboarding";
export { CurveIcon, ToolIcon } from "./icons";
export { ShapeList, ShapeNode, BezierDraftOverlay, SelectionOverlay } from "./ShapeRenderer";

export { useWhiteboard } from "./useWhiteboard";
export type {
  UseWhiteboardOptions,
  WhiteboardController,
  DraftBezier,
  DraftStroke,
} from "./useWhiteboard";

export { HistoryStack } from "./history";
export { throttle } from "./throttle";
export { floodFillMask, maskToPath, floodFillToPath } from "./floodFill";
export {
  exportShapes,
  exportShapesJson,
  importShapes,
  importShapesJson,
  mergeShapesById,
  isValidShape,
} from "./serialize";

export {
  createCanvasSyncClient,
  canvasSync,
  SHAPE_UPDATE_THROTTLE_MS,
} from "./sync";
export type {
  CanvasSyncClient,
  CanvasSnapshot,
  CanvasSyncListener,
} from "./sync";

export {
  createId,
  bezierPathD,
  normalizeRect,
  rectToEllipse,
  defaultBezierHandles,
  arrowHeadPoints,
  rotateTransform,
  skewTransform,
  hitTestShape,
  hitTestShapes,
  translateShape,
  resizeRectFromCorner,
  resizeEllipseFromCorner,
  distToSegment,
  offsetTransform,
} from "./geometry";

export {
  cloneShapeForClipboard,
  pasteShapeFromClipboard,
  bringShapeForward,
  sendShapeBackward,
  canBringForward,
  canSendBackward,
} from "./clipboard";

export { TOOL_META, TOOL_BY_ID, TOOL_SHORTCUT_MAP } from "./toolMeta";

export type {
  WhiteboardShape,
  WhiteboardTool,
  DrawingTool,
  WhiteboardSyncCallbacks,
  WhiteboardExport,
  ShapeGeometry,
  BezierGeometry,
  RectGeometry,
  EllipseGeometry,
  ArrowGeometry,
  FillGeometry,
  HistoryOp,
  Point,
  StrokeWidth,
} from "./types";

export {
  WHITEBOARD_VIEWBOX,
  PRESET_COLORS,
  STROKE_WIDTHS,
  PASTE_OFFSET,
  NUDGE_SMALL,
  NUDGE_LARGE,
} from "./types";
