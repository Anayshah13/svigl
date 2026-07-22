"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import {
  arrowHeadPoints,
  arrowHeadSize,
  arrowShaftEnd,
  bezierCurveControl,
  clampPointToBoard,
  cloneShapes,
  constrainShapeToBoard,
  createId,
  cubicFromCurveControl,
  defaultBezierHandles,
  dist,
  GROUP_SELECTION_PAD,
  groupSelectionBounds,
  groupSelectionHandles,
  groupShapeBounds,
  hitCorner,
  hitRectHandle,
  hitTestShapes,
  maybeSnapPoint,
  normalizeRect,
  parseRotate,
  rectToEllipse,
  rotateTransform,
  scaleShapeToBox,
  scaleShapesToGroupBox,
  selectionCorners,
  selectionRotateHandle,
  setShapeRotation,
  shapeBoxFromSelectionCorner,
  shapeBoxFromSelectionHandle,
  shapeBounds,
  selectionBounds,
  shapesInMarquee,
  skewTransform,
  translateShape,
  unrotatePoint,
  type RectCorner,
  type RectHandle,
} from "./geometry";
import { floodFillToPath } from "./floodFill";
import {
  BezierDraftOverlay,
  GroupSelectionOverlay,
  SelectionOverlay,
  ShapeList,
} from "./ShapeRenderer";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";
import { EraserCursor } from "./EraserCursor";
import type {
  DraftBezier,
  DraftStroke,
  WhiteboardController,
} from "./useWhiteboard";
import {
  WHITEBOARD_VIEWBOX,
  type Point,
  type WhiteboardShape,
} from "./types";
import {
  clampViewport,
  clampZoom,
  FIT_VIEWPORT,
  panBy,
  viewBoxString,
  ZOOM_STEP,
  zoomToward,
  type ViewportState,
} from "./viewport";

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_TOL = 10;
const DOUBLE_TAP_MS = 320;
/** Ignore click-sized strokes so double-click can select instead of placing dots. */
const MIN_SHAPE_PX = 4;
/** Client-px threshold before a press becomes a drag (draw / marquee / move). */
const DRAG_THRESHOLD_PX = 5;

function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const inverse = ctm.inverse();
  if (typeof DOMPoint !== "undefined") {
    const local = new DOMPoint(clientX, clientY).matrixTransform(inverse);
    return { x: local.x, y: local.y };
  }
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(inverse);
  return { x: local.x, y: local.y };
}

function hitHandle(p: Point, handle: Point, radius = 12): boolean {
  return dist(p, handle) <= radius;
}

function boardPoint(point: Point, padding = 0): Point {
  return clampPointToBoard(point, WHITEBOARD_VIEWBOX, padding);
}

function shapesToSvgMarkup(shapes: WhiteboardShape[]): string {
  const { width, height } = WHITEBOARD_VIEWBOX;
  const body = shapes
    .map((s) => {
      const t = s.transform ? ` transform="${s.transform}"` : "";
      switch (s.geometry.kind) {
        case "bezier": {
          const g = s.geometry;
          return `<path d="M ${g.start.x} ${g.start.y} C ${g.cp1.x} ${g.cp1.y} ${g.cp2.x} ${g.cp2.y} ${g.end.x} ${g.end.y}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round"${t}/>`;
        }
        case "rectangle": {
          const g = s.geometry;
          return `<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="${s.fill}"${t}/>`;
        }
        case "ellipse": {
          const g = s.geometry;
          return `<ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="${s.fill}"${t}/>`;
        }
        case "arrow": {
          const g = s.geometry;
          const headSize = arrowHeadSize(s.strokeWidth);
          const shaft = arrowShaftEnd(g.start, g.end, headSize);
          const head = arrowHeadPoints(g.start, g.end, headSize);
          return `<g${t}><line x1="${g.start.x}" y1="${g.start.y}" x2="${shaft.x}" y2="${shaft.y}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round"/><polyline points="${head}" fill="none" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
        }
        case "fill":
          return `<path d="${s.geometry.d}" fill="${s.fill === "none" ? s.stroke : s.fill}" stroke="none"${t}/>`;
        default:
          return "";
      }
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}

function cursorForTool(
  tool: WhiteboardController["tool"],
  interactive: boolean,
  editing: boolean,
  panning: boolean,
): string {
  if (!interactive) return "cursor-default";
  if (panning) return "cursor-grabbing";
  if (editing) return "cursor-grabbing";
  switch (tool) {
    case "select":
      return "cursor-default";
    case "hand":
      return "cursor-grab";
    case "fill":
      return "cursor-cell";
    case "eraser":
      // Custom overlay uses cursor-none when active; fallback otherwise.
      return "cursor-default";
    case "bezier":
    case "rectangle":
    case "ellipse":
    case "arrow":
      return "cursor-crosshair";
    default:
      return "cursor-crosshair";
  }
}

type EditMode =
  | { kind: "move"; last: Point }
  | { kind: "bezier"; handle: "start" | "end" | "control" }
  | { kind: "arrow"; handle: "start" | "end" }
  | {
      kind: "bbox-resize";
      corner: RectCorner;
      origShapeBox: { x: number; y: number; width: number; height: number };
      origSelBox: { x: number; y: number; width: number; height: number };
    }
  | {
      kind: "group-resize";
      handle: RectHandle;
      origGroupBox: { x: number; y: number; width: number; height: number };
      origSelBox: { x: number; y: number; width: number; height: number };
      origShapes: WhiteboardShape[];
    }
  | { kind: "rotate"; center: Point; startAngle: number; origDeg: number };

/** Ambiguous press: resolve to click-select or drag-draw / marquee on move/up. */
type PendingGesture =
  | {
      kind: "draw-or-select";
      origin: Point;
      clientX: number;
      clientY: number;
      hit: WhiteboardShape | null;
    }
  | {
      kind: "marquee";
      origin: Point;
      clientX: number;
      clientY: number;
    };

export interface WhiteboardCanvasProps {
  controller: WhiteboardController;
  className?: string;
  /** Open properties sheet (mobile). */
  onRequestProperties?: () => void;
}

export function WhiteboardCanvas({
  controller,
  className,
  onRequestProperties,
}: WhiteboardCanvasProps) {
  const {
    shapes,
    tool,
    strokeColor,
    fillColor,
    strokeWidth,
    fillTolerance,
    snapToGrid,
    gridSize,
    draft,
    bezierDraft,
    selectedId,
    selectedIds,
    selectShape,
    selectShapes,
    isDrawer,
    isFilling,
    commitShape,
    previewShapeCreation,
    cancelShapeCreationPreview,
    previewShapeUpdate,
    previewShapesPatch,
    beginShapeUpdate,
    beginMultiShapeUpdate,
    commitShapeUpdate,
    setDraft,
    setBezierDraft,
    commitBezierDraft,
    setIsFilling,
    playerId,
    setTool,
    statusMessage,
    preferDraw,
    deleteShapeById,
  } = controller;
  /** Stroke alias used by drafts / overlays. */
  const color = strokeColor;
  /** Guessers stay fit-all; only the drawer may pan/zoom. */
  const allowPanZoom = isDrawer;

  const svgRef = React.useRef<SVGSVGElement>(null);
  const drawingRef = React.useRef(false);
  const originRef = React.useRef<Point | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);
  const windowListenersRef = React.useRef(false);
  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const editModeRef = React.useRef<EditMode | null>(null);
  const shapesRef = React.useRef(shapes);
  shapesRef.current = shapes;

  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOriginRef = React.useRef<{ clientX: number; clientY: number; point: Point } | null>(null);
  const longPressFiredRef = React.useRef(false);
  const lastTapRef = React.useRef<{ t: number; x: number; y: number } | null>(null);
  const pendingGestureRef = React.useRef<PendingGesture | null>(null);
  const marqueeRef = React.useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [marquee, setMarquee] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const updateMarquee = (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null) => {
    marqueeRef.current = box;
    setMarquee(box);
  };
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = React.useState(false);
  const selectedIdsRef = React.useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const [viewport, setViewport] = React.useState<ViewportState>(FIT_VIEWPORT);
  const viewportRef = React.useRef(viewport);
  viewportRef.current = viewport;
  const spaceHeldRef = React.useRef(false);
  const [spaceHeld, setSpaceHeld] = React.useState(false);
  const panGestureRef = React.useRef<{
    lastClientX: number;
    lastClientY: number;
  } | null>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const erasedIdsRef = React.useRef<Set<string>>(new Set());
  const erasingRef = React.useRef(false);
  const pointersRef = React.useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  );
  const pinchRef = React.useRef<{
    distance: number;
    midX: number;
    midY: number;
  } | null>(null);
  const knownShapeIdsRef = React.useRef<Set<string>>(new Set());
  const [enterIds, setEnterIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const containerRef = React.useRef<HTMLDivElement>(null);
  const eraserCursorRef = React.useRef<HTMLDivElement>(null);
  const [eraserCursorVisible, setEraserCursorVisible] = React.useState(false);

  const placeEraserCursor = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    const el = eraserCursorRef.current;
    if (!container || !el) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const showEraserCursor = () => {
    setEraserCursorVisible(true);
  };

  const hideEraserCursor = () => {
    setEraserCursorVisible(false);
  };

  React.useEffect(() => {
    if (tool !== "eraser" || !isDrawer || contextMenu) {
      hideEraserCursor();
    }
  }, [tool, isDrawer, contextMenu]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Guessers always stay fit-all; viewport is local and never synced.
  React.useEffect(() => {
    if (!allowPanZoom) setViewport(FIT_VIEWPORT);
  }, [allowPanZoom]);

  // One-shot enter animation for newly committed shapes (skip remote preview spam).
  React.useEffect(() => {
    const known = knownShapeIdsRef.current;
    const next = new Set<string>();
    const fresh = new Set<string>();
    for (const s of shapes) {
      next.add(s.id);
      if (!known.has(s.id)) fresh.add(s.id);
    }
    knownShapeIdsRef.current = next;
    if (fresh.size === 0) return;
    setEnterIds(fresh);
    const t = window.setTimeout(() => setEnterIds(new Set()), 220);
    return () => window.clearTimeout(t);
  }, [shapes]);

  React.useEffect(() => {
    if (!allowPanZoom) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (!spaceHeldRef.current) {
        spaceHeldRef.current = true;
        setSpaceHeld(true);
      }
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      spaceHeldRef.current = false;
      setSpaceHeld(false);
      panGestureRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [allowPanZoom]);

  const snapPointIfNeeded = React.useCallback(
    (p: Point) => maybeSnapPoint(p, snapToGrid, gridSize),
    [snapToGrid, gridSize],
  );

  const applyZoomAtClient = React.useCallback(
    (clientX: number, clientY: number, nextZoom: number) => {
      const el = containerRef.current ?? svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      setViewport((v) => zoomToward(v, nextZoom, fx, fy));
    },
    [],
  );

  const zoomByStep = React.useCallback(
    (direction: 1 | -1) => {
      const el = containerRef.current;
      if (!el) {
        setViewport((v) =>
          clampViewport({
            ...v,
            zoom: clampZoom(v.zoom * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)),
          }),
        );
        return;
      }
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      applyZoomAtClient(cx, cy, viewportRef.current.zoom * factor);
    },
    [applyZoomAtClient],
  );

  const zoomToFit = React.useCallback(() => {
    setViewport(FIT_VIEWPORT);
  }, []);

  React.useEffect(() => {
    if (!allowPanZoom) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      applyZoomAtClient(e.clientX, e.clientY, viewportRef.current.zoom * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [allowPanZoom, applyZoomAtClient]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressOriginRef.current = null;
  };

  const { width, height } = WHITEBOARD_VIEWBOX;

  const selectedShape = selectedId
    ? shapes.find((s) => s.id === selectedId) ?? null
    : null;
  const selectedShapes = selectedIds
    .map((id) => shapes.find((s) => s.id === id))
    .filter((s): s is WhiteboardShape => Boolean(s));
  const multiGroupBounds =
    selectedShapes.length > 1 ? groupSelectionBounds(selectedShapes) : null;

  const shapeFromDraft = React.useCallback(
    (d: DraftStroke): WhiteboardShape | null => {
      const shapeFill =
        d.tool === "rectangle" || d.tool === "ellipse" ? fillColor : "none";
      const base = {
        id: d.id,
        stroke: strokeColor,
        fill: shapeFill,
        strokeWidth,
        transform: d.transform ?? "",
        createdBy: playerId,
        createdAt: d.createdAt,
      };
      if (
        d.tool === "rectangle" &&
        d.x != null &&
        d.y != null &&
        d.width != null &&
        d.height != null
      ) {
        return {
          ...base,
          tool: "rectangle",
          geometry: {
            kind: "rectangle",
            x: d.x,
            y: d.y,
            width: d.width,
            height: d.height,
          },
        };
      }
      if (
        d.tool === "ellipse" &&
        d.cx != null &&
        d.cy != null &&
        d.rx != null &&
        d.ry != null
      ) {
        return {
          ...base,
          tool: "ellipse",
          geometry: { kind: "ellipse", cx: d.cx, cy: d.cy, rx: d.rx, ry: d.ry },
        };
      }
      if (d.tool === "arrow" && d.start && d.end) {
        return {
          ...base,
          tool: "arrow",
          fill: "none",
          transform: "",
          geometry: { kind: "arrow", start: d.start, end: d.end },
        };
      }
      return null;
    },
    [fillColor, playerId, strokeColor, strokeWidth],
  );

  const shapeFromBezierDraft = React.useCallback(
    (d: DraftBezier): WhiteboardShape => ({
      id: d.id,
      tool: "bezier",
      stroke: strokeColor,
      fill: "none",
      strokeWidth,
      transform: "",
      geometry: {
        kind: "bezier",
        start: d.start,
        end: d.end,
        cp1: d.cp1,
        cp2: d.cp2,
      },
      createdBy: playerId,
      createdAt: d.createdAt,
    }),
    [playerId, strokeColor, strokeWidth],
  );

  const constrainStrokeDraft = React.useCallback(
    (nextDraft: DraftStroke): DraftStroke => {
      const shape = shapeFromDraft(nextDraft);
      if (!shape) return nextDraft;
      // Mid-drag: point clamp only — full fit on commit so arrowheads don't
      // yank the free endpoint while the user is still drawing.
      const mode = shape.geometry.kind === "arrow" ? "points" : "fit";
      const fitted = constrainShapeToBoard(shape, WHITEBOARD_VIEWBOX, { mode });
      const g = fitted.geometry;
      if (g.kind === "rectangle") {
        return { ...nextDraft, ...g, transform: fitted.transform };
      }
      if (g.kind === "ellipse") {
        return { ...nextDraft, ...g, transform: fitted.transform };
      }
      if (g.kind === "arrow") {
        return { ...nextDraft, start: g.start, end: g.end, transform: fitted.transform };
      }
      return nextDraft;
    },
    [shapeFromDraft],
  );

  const constrainBezierDraft = React.useCallback(
    (nextDraft: DraftBezier): DraftBezier => {
      const fitted = constrainShapeToBoard(
        shapeFromBezierDraft(nextDraft),
        WHITEBOARD_VIEWBOX,
        { mode: "points" },
      );
      if (fitted.geometry.kind !== "bezier") return nextDraft;
      return { ...nextDraft, ...fitted.geometry };
    },
    [shapeFromBezierDraft],
  );

  const finishShapeDrag = React.useCallback(() => {
    const d = draftRef.current;
    if (!d) return;

    if (d.tool === "rectangle" && d.width != null && d.height != null && d.x != null && d.y != null) {
      if (d.width < MIN_SHAPE_PX || d.height < MIN_SHAPE_PX) {
        cancelShapeCreationPreview(d.id);
        setDraft(null);
        return;
      }
      const shape = shapeFromDraft(d);
      if (!shape) return;
      setDraft(null);
      commitShape(shape);
      return;
    }

    if (d.tool === "ellipse" && d.rx != null && d.ry != null && d.cx != null && d.cy != null) {
      if (d.rx < MIN_SHAPE_PX / 2 || d.ry < MIN_SHAPE_PX / 2) {
        cancelShapeCreationPreview(d.id);
        setDraft(null);
        return;
      }
      const shape = shapeFromDraft(d);
      if (!shape) return;
      setDraft(null);
      commitShape(shape);
      return;
    }

    if (d.tool === "arrow" && d.start && d.end) {
      if (dist(d.start, d.end) < MIN_SHAPE_PX) {
        cancelShapeCreationPreview(d.id);
        setDraft(null);
        return;
      }
      const shape = shapeFromDraft(d);
      if (!shape) return;
      setDraft(null);
      commitShape(shape);
      return;
    }

    setDraft(null);
  }, [cancelShapeCreationPreview, commitShape, setDraft, shapeFromDraft]);

  const runFill = React.useCallback(
    async (point: Point) => {
      if (isFilling) return;
      setIsFilling(true);
      try {
        const markup = shapesToSvgMarkup(shapes);
        const paint =
          fillColor !== "none" ? fillColor : strokeColor;
        const d = await floodFillToPath({
          width,
          height,
          x: point.x,
          y: point.y,
          fillColor: paint,
          tolerance: fillTolerance,
          svgMarkup: markup,
        });
        if (!d) return;
        const shape: WhiteboardShape = {
          id: createId("fill"),
          tool: "fill",
          stroke: paint,
          fill: paint,
          strokeWidth: 0,
          transform: "",
          geometry: { kind: "fill", d },
          createdBy: playerId,
          createdAt: Date.now(),
        };
        commitShape(shape);
      } finally {
        setIsFilling(false);
      }
    },
    [
      isFilling,
      setIsFilling,
      shapes,
      width,
      height,
      fillColor,
      strokeColor,
      fillTolerance,
      playerId,
      commitShape,
    ],
  );

  const eraseAt = React.useCallback(
    (p: Point) => {
      const hit = hitTestShapes(shapesRef.current, p, 14);
      if (!hit || erasedIdsRef.current.has(hit.id)) return;
      erasedIdsRef.current.add(hit.id);
      deleteShapeById(hit.id);
    },
    [deleteShapeById],
  );

  const tryBeginEdit = (
    p: Point,
    shape: WhiteboardShape,
    opts?: { handlesOnly?: boolean },
  ): boolean => {
    const g = shape.geometry;
    const rot = parseRotate(shape.transform);
    const local = rot ? unrotatePoint(p, rot.cx, rot.cy, rot.deg) : p;

    // Shape endpoints/controls win over selection-box corners. For lines/curves
    // the AABB corners sit near the endpoints — checking bbox first routed edge
    // drags through non-uniform scaleShapeToBox and warped proportions.
    if (g.kind === "bezier") {
      const control = bezierCurveControl(g.start, g.cp1, g.cp2, g.end);
      if (hitHandle(local, control)) {
        editModeRef.current = { kind: "bezier", handle: "control" };
        return true;
      }
      if (hitHandle(local, g.start)) {
        editModeRef.current = { kind: "bezier", handle: "start" };
        return true;
      }
      if (hitHandle(local, g.end)) {
        editModeRef.current = { kind: "bezier", handle: "end" };
        return true;
      }
    }

    if (g.kind === "arrow") {
      if (hitHandle(local, g.start)) {
        editModeRef.current = { kind: "arrow", handle: "start" };
        return true;
      }
      if (hitHandle(local, g.end)) {
        editModeRef.current = { kind: "arrow", handle: "end" };
        return true;
      }
    }

    if (hitHandle(local, selectionRotateHandle(shape), 14)) {
      const sb = shapeBounds(shape);
      const center = { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 };
      editModeRef.current = {
        kind: "rotate",
        center,
        startAngle: Math.atan2(local.y - center.y, local.x - center.x),
        origDeg: rot?.deg ?? 0,
      };
      return true;
    }

    const corner = hitCorner(local, selectionCorners(shape), 14);
    if (corner) {
      editModeRef.current = {
        kind: "bbox-resize",
        corner,
        origShapeBox: shapeBounds(shape),
        origSelBox: selectionBounds(shape),
      };
      return true;
    }

    if (opts?.handlesOnly) return false;
    if (!hitTestShapes([shape], p, 14)) return false;
    editModeRef.current = { kind: "move", last: p };
    return true;
  };

  const beginDrawAt = (rawPoint: Point) => {
    const snapped = snapPointIfNeeded(rawPoint);
    const p = boardPoint(snapped, tool === "fill" ? 0 : strokeWidth / 2);
    selectShape(null);
    drawingRef.current = true;
    originRef.current = p;

    if (tool === "fill") {
      drawingRef.current = false;
      void runFill(p);
      return;
    }

    if (tool === "eraser") {
      erasingRef.current = true;
      erasedIdsRef.current = new Set();
      eraseAt(p);
      return;
    }

    if (tool === "bezier") {
      const handles = defaultBezierHandles(p, p);
      setBezierDraft({
        id: createId("bezier"),
        createdAt: Date.now(),
        start: p,
        end: p,
        cp1: handles.cp1,
        cp2: handles.cp2,
        activeHandle: "end",
        editing: false,
      });
      return;
    }

    if (tool === "rectangle") {
      setDraft({
        id: createId("rect"),
        createdAt: Date.now(),
        tool: "rectangle",
        start: p,
        end: p,
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        transform: "",
      });
      return;
    }

    if (tool === "ellipse") {
      setDraft({
        id: createId("ellipse"),
        createdAt: Date.now(),
        tool: "ellipse",
        start: p,
        end: p,
        cx: p.x,
        cy: p.y,
        rx: 0,
        ry: 0,
        transform: "",
      });
      return;
    }

    if (tool === "arrow") {
      setDraft({
        id: createId("arrow"),
        createdAt: Date.now(),
        tool: "arrow",
        start: p,
        end: p,
      });
    }
  };

  const selectAndDrag = (shape: WhiteboardShape, p: Point) => {
    setTool("select");
    const prior = selectedIdsRef.current;
    const ids =
      prior.includes(shape.id) && prior.length > 1 ? prior : [shape.id];
    selectShapes(ids);
    if (ids.length > 1) {
      beginMultiShapeUpdate();
      editModeRef.current = { kind: "move", last: p };
    } else {
      beginShapeUpdate(shape);
      tryBeginEdit(p, shape);
    }
    drawingRef.current = false;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawer || isFilling) return;
    const svg = svgRef.current;
    if (!svg) return;

    e.preventDefault();
    setContextMenu(null);
    pendingGestureRef.current = null;
    updateMarquee(null);

    if (tool === "eraser") {
      placeEraserCursor(e.clientX, e.clientY);
      showEraserCursor();
    }

    pointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    // Two-finger pinch / pan (drawer only) — never starts a stroke.
    if (allowPanZoom && pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const [a, b] = pts;
      if (a && b) {
        pinchRef.current = {
          distance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
        };
        pendingGestureRef.current = null;
        drawingRef.current = false;
        erasingRef.current = false;
        panGestureRef.current = null;
        setIsPanning(true);
      }
      return;
    }

    const wantsPan =
      allowPanZoom && (tool === "hand" || spaceHeldRef.current);
    if (wantsPan) {
      capturePointer(svg, e.pointerId);
      panGestureRef.current = {
        lastClientX: e.clientX,
        lastClientY: e.clientY,
      };
      setIsPanning(true);
      drawingRef.current = false;
      return;
    }

    const p = clientToSvgPoint(svg, e.clientX, e.clientY);
    const now = Date.now();
    const prev = lastTapRef.current;
    const isDoubleTap =
      Boolean(prev) &&
      now - prev!.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - prev!.x, e.clientY - prev!.y) < 28;
    const isDoubleClick = e.detail === 2;
    const isDoubleActivate = isDoubleTap || isDoubleClick;

    if (isDoubleActivate) {
      lastTapRef.current = null;
      if (draftRef.current) cancelShapeCreationPreview(draftRef.current.id);
      if (bezierDraft) cancelShapeCreationPreview(bezierDraft.id);
      setDraft(null);
      drawingRef.current = false;
      if (bezierDraft) {
        setBezierDraft(null);
        if (!(preferDraw && tool !== "select" && tool !== "hand")) return;
        // preferDraw: cancel unfinished draft and start a fresh stroke below
      } else {
        const hit = hitTestShapes(shapesRef.current, p, 14);
        if (hit) {
          capturePointer(svg, e.pointerId);
          selectAndDrag(hit, p);
          return;
        }
        if (allowPanZoom) {
          zoomToFit();
          selectShape(null);
          return;
        }
        if (selectedId) {
          selectShape(null);
          return;
        }
      }
    } else {
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
    }

    // Skip stale bezierDraft handling when double-tap just cleared it for redraw.
    const activeBezier =
      isDoubleActivate && preferDraw && tool !== "select" ? null : bezierDraft;

    if (activeBezier?.editing) {
      const control = bezierCurveControl(
        activeBezier.start,
        activeBezier.cp1,
        activeBezier.cp2,
        activeBezier.end,
      );
      if (hitHandle(p, control)) {
        capturePointer(svg, e.pointerId);
        setBezierDraft({ ...activeBezier, activeHandle: "control" });
        return;
      }
      // Commit, then immediately start the next stroke when sketching.
      commitBezierDraft();
      if (preferDraw && tool !== "select") {
        capturePointer(svg, e.pointerId);
        beginDrawAt(p);
      }
      return;
    }

    capturePointer(svg, e.pointerId);

    // Multi-select group handles: scale all selected shapes together.
    if (selectedIdsRef.current.length > 1) {
      const ids = selectedIdsRef.current;
      const idSet = new Set(ids);
      const groupShapes = shapesRef.current.filter((s) => idSet.has(s.id));
      const handles = groupSelectionHandles(groupShapes);
      const groupBox = groupShapeBounds(groupShapes);
      const selBox = groupSelectionBounds(groupShapes);
      if (handles && groupBox && selBox) {
        const handle = hitRectHandle(p, handles, 14);
        if (handle) {
          setTool("select");
          beginMultiShapeUpdate();
          editModeRef.current = {
            kind: "group-resize",
            handle,
            origGroupBox: groupBox,
            origSelBox: selBox,
            origShapes: cloneShapes(groupShapes),
          };
          drawingRef.current = false;
          return;
        }
      }
    }

    // Selected shape handles work from any tool (not body — body is click/drag).
    if (
      selectedIdsRef.current.length <= 1 &&
      selectedShape &&
      tryBeginEdit(p, selectedShape, { handlesOnly: true })
    ) {
      setTool("select");
      beginShapeUpdate(selectedShape);
      drawingRef.current = false;
      return;
    }

    // Selection tool: hit → select+move; empty → marquee
    if (tool === "select") {
      const hit = hitTestShapes(shapesRef.current, p, 12);
      if (hit) {
        selectAndDrag(hit, p);
        return;
      }
      pendingGestureRef.current = {
        kind: "marquee",
        origin: p,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      drawingRef.current = false;
      return;
    }

    // Mobile: delay stroke so a still long-press can select / open menu
    // (skipped in preferDraw — long-press selecting previous lines is frustrating)
    if (
      isCoarsePointer &&
      tool !== "fill" &&
      tool !== "eraser" &&
      tool !== "hand" &&
      !preferDraw
    ) {
      longPressFiredRef.current = false;
      longPressOriginRef.current = { clientX: e.clientX, clientY: e.clientY, point: p };
      longPressTimerRef.current = setTimeout(() => {
        const origin = longPressOriginRef.current;
        if (!origin) return;
        const hit = hitTestShapes(shapesRef.current, origin.point, 14);
        if (hit) {
          longPressFiredRef.current = true;
          pendingGestureRef.current = null;
          drawingRef.current = false;
          setTool("select");
          selectShape(hit.id);
          setContextMenu({
            x: origin.clientX,
            y: origin.clientY,
            hasSelection: true,
          });
        }
      }, LONG_PRESS_MS);
      drawingRef.current = false;
      originRef.current = p;
      return;
    }

    // Drawing tools: defer click-vs-drag — click selects a shape, drag draws.
    if (tool === "fill" || tool === "eraser") {
      beginDrawAt(p);
      return;
    }

    const hit = hitTestShapes(shapesRef.current, p, 12);
    pendingGestureRef.current = {
      kind: "draw-or-select",
      origin: p,
      clientX: e.clientX,
      clientY: e.clientY,
      hit,
    };
    drawingRef.current = false;
  };

  const capturePointer = (svg: SVGSVGElement, pointerId: number) => {
    pointerIdRef.current = pointerId;
    try {
      svg.setPointerCapture(pointerId);
    } catch {
      /* iOS Safari fallback via window listeners */
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawer) return;
    const svg = svgRef.current;
    if (!svg) return;

    if (tool === "eraser" && !contextMenu) {
      placeEraserCursor(e.clientX, e.clientY);
      if (!eraserCursorVisible) showEraserCursor();
    }

    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    // Pinch / two-finger pan
    if (allowPanZoom && pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const [a, b] = pts;
      if (a && b) {
        const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        const prev = pinchRef.current;
        if (prev.distance > 0 && distance > 0) {
          const scale = distance / prev.distance;
          const el = containerRef.current ?? svg;
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const fx = (midX - rect.left) / rect.width;
            const fy = (midY - rect.top) / rect.height;
            setViewport((v) => {
              let next = zoomToward(v, v.zoom * scale, fx, fy);
              const viewW = width / next.zoom;
              const viewH = height / next.zoom;
              const dxBoard = ((midX - prev.midX) / rect.width) * viewW;
              const dyBoard = ((midY - prev.midY) / rect.height) * viewH;
              next = panBy(next, dxBoard, dyBoard);
              viewportRef.current = next;
              return next;
            });
          }
        }
        pinchRef.current = { distance, midX, midY };
      }
      return;
    }

    if (panGestureRef.current) {
      const prev = panGestureRef.current;
      const el = containerRef.current ?? svg;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const viewW = width / viewportRef.current.zoom;
        const viewH = height / viewportRef.current.zoom;
        const dxBoard =
          ((e.clientX - prev.lastClientX) / rect.width) * viewW;
        const dyBoard =
          ((e.clientY - prev.lastClientY) / rect.height) * viewH;
        setViewport((v) => panBy(v, dxBoard, dyBoard));
      }
      panGestureRef.current = {
        lastClientX: e.clientX,
        lastClientY: e.clientY,
      };
      return;
    }

    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;

    // Cancel long-press if finger moved — and start the deferred stroke
    if (longPressOriginRef.current && !longPressFiredRef.current) {
      const o = longPressOriginRef.current;
      if (Math.hypot(e.clientX - o.clientX, e.clientY - o.clientY) > LONG_PRESS_MOVE_TOL) {
        const start = o.point;
        clearLongPress();
        pendingGestureRef.current = null;
        if (!draft && !bezierDraft && tool !== "select") {
          // Ensure draft state is committed before this move updates geometry.
          flushSync(() => {
            beginDrawAt(start);
          });
        }
      }
    }

    if (longPressFiredRef.current) return;

    const pending = pendingGestureRef.current;
    if (pending) {
      const moved = Math.hypot(e.clientX - pending.clientX, e.clientY - pending.clientY);
      if (moved > DRAG_THRESHOLD_PX) {
        if (pending.kind === "draw-or-select") {
          pendingGestureRef.current = null;
          flushSync(() => {
            beginDrawAt(pending.origin);
          });
          // Fall through so this same move updates the new draft.
        } else if (pending.kind === "marquee") {
          const mp = clientToSvgPoint(svg, e.clientX, e.clientY);
          updateMarquee(
            normalizeRect(
              pending.origin.x,
              pending.origin.y,
              mp.x,
              mp.y,
              false,
            ),
          );
          return;
        }
      } else {
        return;
      }
    }

    const rawP = clientToSvgPoint(svg, e.clientX, e.clientY);
    const p = snapToGrid && (editModeRef.current || erasingRef.current)
      ? snapPointIfNeeded(rawP)
      : rawP;

    if (erasingRef.current) {
      eraseAt(p);
      return;
    }

    const edit = editModeRef.current;
    if (edit?.kind === "group-resize") {
      const newGroupBox = shapeBoxFromSelectionHandle(
        edit.origGroupBox,
        edit.origSelBox,
        edit.handle,
        p,
        e.shiftKey,
        GROUP_SELECTION_PAD,
      );
      previewShapesPatch(
        scaleShapesToGroupBox(edit.origShapes, edit.origGroupBox, newGroupBox),
      );
      return;
    }

    if (edit && selectedId) {
      const current = shapesRef.current.find((s) => s.id === selectedId);
      if (!current) return;

      if (edit.kind === "move") {
        const dx = p.x - edit.last.x;
        const dy = p.y - edit.last.y;
        if (dx || dy) {
          const ids = selectedIdsRef.current;
          if (ids.length > 1) {
            const idSet = new Set(ids);
            const patched = shapesRef.current
              .filter((s) => idSet.has(s.id))
              .map((s) => translateShape(s, dx, dy));
            previewShapesPatch(patched);
          } else {
            previewShapeUpdate(translateShape(current, dx, dy));
          }
          editModeRef.current = { kind: "move", last: p };
        }
        return;
      }

      if (edit.kind === "bezier" && current.geometry.kind === "bezier") {
        const pt = boardPoint(p, current.strokeWidth / 2);
        const g = current.geometry;
        // Point-clamp only — do not fit/translate the whole curve mid-drag.
        if (edit.handle === "control") {
          const cps = cubicFromCurveControl(g.start, g.end, pt);
          previewShapeUpdate(
            { ...current, geometry: { ...g, ...cps } },
            { constrain: "points" },
          );
        } else if (edit.handle === "start") {
          const control = bezierCurveControl(g.start, g.cp1, g.cp2, g.end);
          const cps = cubicFromCurveControl(pt, g.end, control);
          previewShapeUpdate(
            { ...current, geometry: { ...g, start: pt, ...cps } },
            { constrain: "points" },
          );
        } else {
          const control = bezierCurveControl(g.start, g.cp1, g.cp2, g.end);
          const cps = cubicFromCurveControl(g.start, pt, control);
          previewShapeUpdate(
            { ...current, geometry: { ...g, end: pt, ...cps } },
            { constrain: "points" },
          );
        }
        return;
      }

      if (edit.kind === "arrow" && current.geometry.kind === "arrow") {
        const g = {
          ...current.geometry,
          [edit.handle]: boardPoint(p, current.strokeWidth / 2),
        };
        previewShapeUpdate(
          { ...current, geometry: g },
          { constrain: "points" },
        );
        return;
      }

      if (edit.kind === "bbox-resize") {
        const rot = parseRotate(current.transform);
        const local = rot ? unrotatePoint(p, rot.cx, rot.cy, rot.deg) : p;
        const newShapeBox = shapeBoxFromSelectionCorner(
          edit.origShapeBox,
          edit.origSelBox,
          edit.corner,
          local,
          e.shiftKey,
        );
        let next = scaleShapeToBox(current, edit.origShapeBox, newShapeBox);
        const nextRot = parseRotate(current.transform);
        if (nextRot) {
          const nb = shapeBounds(next);
          next = setShapeRotation(next, {
            x: nb.x + nb.width / 2,
            y: nb.y + nb.height / 2,
          }, nextRot.deg);
        }
        previewShapeUpdate(next);
        return;
      }

      if (edit.kind === "rotate") {
        const angle = Math.atan2(p.y - edit.center.y, p.x - edit.center.x);
        const deltaDeg = ((angle - edit.startAngle) * 180) / Math.PI;
        previewShapeUpdate(
          setShapeRotation(current, edit.center, edit.origDeg + deltaDeg),
        );
        return;
      }

      return;
    }

    const drawPoint = boardPoint(
      snapPointIfNeeded(rawP),
      strokeWidth / 2,
    );

    if (bezierDraft) {
      if (!bezierDraft.editing && bezierDraft.activeHandle === "end") {
        const handles = defaultBezierHandles(bezierDraft.start, drawPoint);
        const next = constrainBezierDraft({
          ...bezierDraft,
          end: drawPoint,
          cp1: handles.cp1,
          cp2: handles.cp2,
        });
        setBezierDraft(next);
        previewShapeCreation(shapeFromBezierDraft(next));
        return;
      }
      if (bezierDraft.activeHandle === "control") {
        const cps = cubicFromCurveControl(
          bezierDraft.start,
          bezierDraft.end,
          drawPoint,
        );
        const next = constrainBezierDraft({
          ...bezierDraft,
          cp1: cps.cp1,
          cp2: cps.cp2,
        });
        setBezierDraft(next);
        previewShapeCreation(shapeFromBezierDraft(next));
        return;
      }
      return;
    }

    if (!drawingRef.current || !draft || !originRef.current) return;

    const origin = originRef.current;
    const shift = e.shiftKey;
    const alt = e.altKey;

    if (draft.tool === "rectangle") {
      const box = normalizeRect(origin.x, origin.y, drawPoint.x, drawPoint.y, shift);
      const skewDeg = alt
        ? Math.max(-45, Math.min(45, (drawPoint.x - origin.x) * 0.15))
        : 0;
      const next = constrainStrokeDraft({
        ...draft,
        end: drawPoint,
        ...box,
        skewDeg,
        transform: skewTransform(skewDeg, box.x, box.y + box.height / 2),
      });
      setDraft(next);
      const shape = shapeFromDraft(next);
      if (shape) previewShapeCreation(shape);
      return;
    }

    if (draft.tool === "ellipse") {
      const ell = rectToEllipse(
        origin.x,
        origin.y,
        drawPoint.x,
        drawPoint.y,
        shift,
      );
      const rotateDeg = alt
        ? Math.atan2(drawPoint.y - origin.y, drawPoint.x - origin.x) *
          (180 / Math.PI)
        : 0;
      const next = constrainStrokeDraft({
        ...draft,
        end: drawPoint,
        ...ell,
        rotateDeg,
        transform: rotateTransform(ell.cx, ell.cy, rotateDeg),
      });
      setDraft(next);
      const shape = shapeFromDraft(next);
      if (shape) previewShapeCreation(shape);
      return;
    }

    if (draft.tool === "arrow") {
      const next = constrainStrokeDraft({ ...draft, end: drawPoint });
      setDraft(next);
      const shape = shapeFromDraft(next);
      if (shape) previewShapeCreation(shape);
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement> | PointerEvent) => {
    const pointerId = "pointerId" in e ? e.pointerId : pointerIdRef.current;
    if (pointerId != null) pointersRef.current.delete(pointerId);

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (panGestureRef.current && pointerIdRef.current !== null) {
      if (pointerId !== pointerIdRef.current && pointerId != null) {
        /* other finger */
      } else {
        panGestureRef.current = null;
        setIsPanning(false);
        const svg = svgRef.current;
        if (svg && pointerIdRef.current !== null) {
          try {
            svg.releasePointerCapture(pointerIdRef.current);
          } catch {
            /* already released */
          }
        }
        pointerIdRef.current = null;
        return;
      }
    }

    if (erasingRef.current) {
      erasingRef.current = false;
      erasedIdsRef.current = new Set();
      drawingRef.current = false;
      const svg = svgRef.current;
      if (svg && pointerIdRef.current !== null) {
        try {
          svg.releasePointerCapture(pointerIdRef.current);
        } catch {
          /* already released */
        }
      }
      pointerIdRef.current = null;
      if (svg && "clientX" in e) {
        const rect = svg.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (!inside) hideEraserCursor();
      }
      return;
    }

    if (pointerIdRef.current === null) return;
    if ("pointerId" in e && e.pointerId !== pointerIdRef.current) return;

    clearLongPress();

    const svg = svgRef.current;
    if (svg && pointerIdRef.current !== null) {
      try {
        svg.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* already released */
      }
    }
    pointerIdRef.current = null;

    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      pendingGestureRef.current = null;
      updateMarquee(null);
      setDraft(null);
      setBezierDraft(null);
      drawingRef.current = false;
      return;
    }

    const pending = pendingGestureRef.current;
    pendingGestureRef.current = null;
    if (pending?.kind === "draw-or-select") {
      if (pending.hit) {
        // Click (no drag): select the shape; keep the drawing tool so the
        // next drag can still start a new stroke.
        selectShape(pending.hit.id);
      } else if (selectedId) {
        selectShape(null);
      }
      drawingRef.current = false;
      return;
    }
    if (pending?.kind === "marquee") {
      const box = marqueeRef.current;
      updateMarquee(null);
      if (box && box.width >= 2 && box.height >= 2) {
        const hits = shapesInMarquee(shapesRef.current, box);
        selectShapes(hits.map((s) => s.id));
      } else {
        selectShape(null);
      }
      drawingRef.current = false;
      return;
    }

    if (editModeRef.current) {
      editModeRef.current = null;
      commitShapeUpdate();
      return;
    }

    if (bezierDraft && !bezierDraft.editing) {
      if (dist(bezierDraft.start, bezierDraft.end) < MIN_SHAPE_PX) {
        cancelShapeCreationPreview(bezierDraft.id);
        setBezierDraft(null);
      } else if (preferDraw) {
        // Sketch mode: commit immediately — no Enter/Esc handle-edit step.
        commitBezierDraft();
      } else {
        setBezierDraft({ ...bezierDraft, activeHandle: null, editing: true });
      }
      drawingRef.current = false;
      return;
    }

    if (bezierDraft?.editing && bezierDraft.activeHandle) {
      setBezierDraft({ ...bezierDraft, activeHandle: null });
      return;
    }

    if (!drawingRef.current) return;
    drawingRef.current = false;

    finishShapeDrag();
  };

  const onContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    // Sketch/demo mode: no layer/edit context menu — keep drawing fluid.
    if (preferDraw) return;
    const svg = svgRef.current;
    if (!svg) return;
    const p = clientToSvgPoint(svg, e.clientX, e.clientY);
    const hit = hitTestShapes(shapesRef.current, p, 12);
    if (hit) {
      setTool("select");
      selectShape(hit.id);
      setContextMenu({ x: e.clientX, y: e.clientY, hasSelection: true });
    } else {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        hasSelection: selectedId != null,
      });
    }
  };

  const onPointerMoveRef = React.useRef(onPointerMove);
  const onPointerUpRef = React.useRef(onPointerUp);
  onPointerMoveRef.current = onPointerMove;
  onPointerUpRef.current = onPointerUp;

  React.useEffect(() => {
    if (windowListenersRef.current) return;

    const onMove = (event: PointerEvent) => {
      if (pointerIdRef.current === null) return;
      if (event.pointerId !== pointerIdRef.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      if (typeof svg.hasPointerCapture === "function" && svg.hasPointerCapture(event.pointerId)) {
        return;
      }
      onPointerMoveRef.current({
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        preventDefault: () => event.preventDefault(),
        currentTarget: svg,
        target: svg,
      } as unknown as React.PointerEvent<SVGSVGElement>);
    };

    const onUp = (event: PointerEvent) => {
      if (pointerIdRef.current === null) return;
      onPointerUpRef.current(event);
    };

    windowListenersRef.current = true;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      windowListenersRef.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const interactive = isDrawer && !isFilling;
  const editing = Boolean(editModeRef.current || (bezierDraft && !bezierDraft.editing));
  const panning = isPanning || (spaceHeld && allowPanZoom) || tool === "hand";
  const eraserCursorActive =
    interactive &&
    tool === "eraser" &&
    !contextMenu &&
    !(panning && isPanning) &&
    !editing;

  const gridPatternId = "wb-snap-grid";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-0 overflow-hidden rounded-2xl border border-plum/15 bg-white shadow-inner",
        className,
      )}
    >
      <svg
        ref={svgRef}
        viewBox={
          allowPanZoom ? viewBoxString(viewport) : `0 0 ${width} ${height}`
        }
        preserveAspectRatio="xMidYMid meet"
        className={cn(
          "block h-full w-full touch-none select-none",
          eraserCursorActive
            ? "cursor-none"
            : cursorForTool(tool, interactive, editing, panning && isPanning),
        )}
        role="img"
        aria-label={isDrawer ? "Drawing whiteboard" : "Whiteboard (view only)"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={(e) => {
          if (!eraserCursorActive) return;
          placeEraserCursor(e.clientX, e.clientY);
          showEraserCursor();
        }}
        onPointerLeave={() => {
          if (!erasingRef.current) hideEraserCursor();
        }}
        onContextMenu={onContextMenu}
      >
        <defs>
          {snapToGrid && isDrawer ? (
            <pattern
              id={gridPatternId}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="rgba(112, 63, 147, 0.18)"
                strokeWidth={1}
              />
            </pattern>
          ) : null}
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        {snapToGrid && isDrawer ? (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#${gridPatternId})`}
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        <ShapeList
          shapes={shapes}
          selectedIds={selectedIds}
          enterIds={enterIds}
        />

        {multiGroupBounds ? (
          <GroupSelectionOverlay bounds={multiGroupBounds} />
        ) : selectedShape ? (
          <SelectionOverlay shape={selectedShape} />
        ) : null}

        {marquee && marquee.width > 0 && marquee.height > 0 ? (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.width}
            height={marquee.height}
            fill="rgba(112, 63, 147, 0.06)"
            stroke="#703F93"
            strokeWidth={1}
            strokeDasharray="3 2"
            style={{ pointerEvents: "none" }}
          />
        ) : null}

        {draft?.tool === "rectangle" &&
        draft.x != null &&
        draft.y != null &&
        draft.width != null &&
        draft.height != null ? (
          <rect
            x={draft.x}
            y={draft.y}
            width={Math.max(draft.width, 1)}
            height={Math.max(draft.height, 1)}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={fillColor === "none" ? "none" : fillColor}
            transform={draft.transform || undefined}
            opacity={0.9}
          />
        ) : null}

        {draft?.tool === "ellipse" &&
        draft.cx != null &&
        draft.cy != null &&
        draft.rx != null &&
        draft.ry != null ? (
          <ellipse
            cx={draft.cx}
            cy={draft.cy}
            rx={Math.max(draft.rx, 0.5)}
            ry={Math.max(draft.ry, 0.5)}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={fillColor === "none" ? "none" : fillColor}
            transform={draft.transform || undefined}
            opacity={0.9}
          />
        ) : null}

        {draft?.tool === "arrow" && draft.start && draft.end ? (
          <g opacity={0.9}>
            <line
              x1={draft.start.x}
              y1={draft.start.y}
              x2={arrowShaftEnd(draft.start, draft.end, arrowHeadSize(strokeWidth)).x}
              y2={arrowShaftEnd(draft.start, draft.end, arrowHeadSize(strokeWidth)).y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <polyline
              points={arrowHeadPoints(
                draft.start,
                draft.end,
                arrowHeadSize(strokeWidth),
              )}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {bezierDraft ? (
          <BezierDraftOverlay
            start={bezierDraft.start}
            end={bezierDraft.end}
            cp1={bezierDraft.cp1}
            cp2={bezierDraft.cp2}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        ) : null}
      </svg>

      {allowPanZoom ? (
        <div
          className="absolute bottom-3 right-3 z-10 flex flex-col gap-1"
          role="group"
          aria-label="Zoom controls"
        >
          <button
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => zoomByStep(1)}
            className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-plum/20 bg-white/95 text-lg font-bold text-plum shadow-sm hover:bg-plum-light/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
          >
            +
          </button>
          <button
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => zoomByStep(-1)}
            className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-plum/20 bg-white/95 text-lg font-bold text-plum shadow-sm hover:bg-plum-light/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
          >
            −
          </button>
          <button
            type="button"
            title="Zoom to fit"
            aria-label="Zoom to fit"
            onClick={zoomToFit}
            className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-plum/20 bg-white/95 text-[10px] font-bold uppercase tracking-wide text-plum shadow-sm hover:bg-plum-light/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
          >
            Fit
          </button>
        </div>
      ) : null}

      <EraserCursor
        ref={eraserCursorRef}
        visible={eraserCursorActive && eraserCursorVisible}
      />

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
        >
          {statusMessage}
        </div>
      ) : null}

      {bezierDraft?.editing && !preferDraw && !statusMessage ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
          Drag handles · Enter to commit · Esc to cancel
        </div>
      ) : null}

      {isFilling ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40">
          <span className="rounded-full bg-plum px-3 py-1 text-xs font-semibold text-white">
            Filling…
          </span>
        </div>
      ) : null}

      {!isDrawer ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          Watching
        </div>
      ) : null}

      <ContextMenu
        state={contextMenu}
        controller={controller}
        onClose={() => setContextMenu(null)}
        onOpenProperties={onRequestProperties}
      />
    </div>
  );
}
