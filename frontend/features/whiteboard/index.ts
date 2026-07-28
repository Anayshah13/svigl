/**
 * Svigl SVG Whiteboard — structured shape list (never a flattened SVG string).
 *
 * Production wiring lives in `features/room/game/GameWhiteboard.tsx`, which
 * mounts `<Whiteboard />` and bridges ops through `createCanvasSyncClient`
 * + `appWebSocket` canvas events.
 */

export { Whiteboard } from "./Whiteboard";
export type { WhiteboardProps } from "./Whiteboard";
export { DRAWER_WHITEBOARD_UI } from "./drawerUi";
export {
  DRAW_COLOR_SHEETS,
  DRAW_COLOR_SHEET_PRIMARY,
  DRAW_COLOR_SHEET_MORE,
} from "./drawPalette";

export { WhiteboardCanvas } from "./WhiteboardCanvas";
export { SquareBoard } from "./SquareBoard";
export { ToolDock } from "./ToolDock";
export { StyleDock } from "./StyleDock";
export { ActionBar } from "./ActionBar";
export { PropertiesPanel } from "./PropertiesPanel";
export { ContextMenu } from "./ContextMenu";
export { DrawerOnboarding, useDrawerOnboarding } from "./DrawerOnboarding";
export { ShortcutHelp } from "./ShortcutHelp";
export { CurveIcon, ToolIcon } from "./icons";
export { ShapeList, BezierDraftOverlay, SelectionOverlay } from "./ShapeRenderer";

export { useWhiteboard } from "./useWhiteboard";
export type {
  UseWhiteboardOptions,
  WhiteboardController,
  DraftBezier,
  DraftStroke,
} from "./useWhiteboard";

export { HistoryStack, applyForward, applyInverse } from "./history";
export { throttle } from "./throttle";
export { floodFillMask, maskToPath, floodFillToPath } from "./floodFill";
export {
  exportShapes,
  importShapes,
  importShapesJson,
  mergeShapesById,
  isValidShape,
  normalizeShape,
  coercePencilGeometry,
  isSvgPathD,
} from "./serialize";

export {
  createCanvasSyncClient,
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
  bezierCurveControl,
  cubicFromCurveControl,
  normalizeRect,
  rectToEllipse,
  defaultBezierHandles,
  shapesInMarquee,
  arrowHeadPoints,
  rotateTransform,
  skewTransform,
  hitTestShape,
  hitTestShapes,
  translateShape,
  resizeRectFromCorner,
  distToSegment,
  offsetTransform,
  snapCoord,
  snapPoint,
  maybeSnapCoord,
  maybeSnapPoint,
} from "./geometry";

export {
  FIT_VIEWPORT,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  clampZoom,
  clampViewport,
  zoomToward,
  panBy,
  viewBoxString,
} from "./viewport";
export type { ViewportState } from "./viewport";

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
  ColorTarget,
} from "./types";

export {
  WHITEBOARD_VIEWBOX,
  PRESET_COLORS,
  STROKE_WIDTHS,
  GRID_SIZE,
  PASTE_OFFSET,
  NUDGE_SMALL,
  NUDGE_LARGE,
} from "./types";
