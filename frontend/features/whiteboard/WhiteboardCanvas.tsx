"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import {
  arrowHeadPoints,
  arrowHeadSize,
  arrowShaftEnd,
  createId,
  defaultBezierHandles,
  dist,
  hitCorner,
  hitTestShapes,
  normalizeRect,
  parseRotate,
  rectToEllipse,
  rotateTransform,
  scaleShapeToBox,
  selectionCorners,
  selectionRotateHandle,
  setShapeRotation,
  shapeBoxFromSelectionCorner,
  shapeBounds,
  selectionBounds,
  skewTransform,
  translateShape,
  unrotatePoint,
  type RectCorner,
} from "./geometry";
import { floodFillToPath } from "./floodFill";
import {
  BezierDraftOverlay,
  SelectionOverlay,
  ShapeList,
} from "./ShapeRenderer";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";
import type { WhiteboardController } from "./useWhiteboard";
import {
  WHITEBOARD_VIEWBOX,
  type Point,
  type WhiteboardShape,
} from "./types";

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_TOL = 10;
const DOUBLE_TAP_MS = 320;
/** Ignore click-sized strokes so double-click can select instead of placing dots. */
const MIN_SHAPE_PX = 4;

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
): string {
  if (!interactive) return "cursor-default";
  if (editing) return "cursor-grabbing";
  switch (tool) {
    case "select":
      return "cursor-default";
    case "fill":
      return "cursor-cell";
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
  | { kind: "bezier"; handle: "start" | "end" | "cp1" | "cp2" }
  | { kind: "arrow"; handle: "start" | "end" }
  | {
      kind: "bbox-resize";
      corner: RectCorner;
      origShapeBox: { x: number; y: number; width: number; height: number };
      origSelBox: { x: number; y: number; width: number; height: number };
    }
  | { kind: "rotate"; center: Point; startAngle: number; origDeg: number };

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
    color,
    strokeWidth,
    fillTolerance,
    draft,
    bezierDraft,
    selectedId,
    selectShape,
    isDrawer,
    isFilling,
    commitShape,
    previewShapeUpdate,
    beginShapeUpdate,
    commitShapeUpdate,
    setDraft,
    setBezierDraft,
    commitBezierDraft,
    setIsFilling,
    playerId,
    setTool,
    statusMessage,
  } = controller;

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
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

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

  const finishShapeDrag = React.useCallback(() => {
    const d = draftRef.current;
    if (!d) return;

    if (d.tool === "rectangle" && d.width != null && d.height != null && d.x != null && d.y != null) {
      if (d.width < MIN_SHAPE_PX || d.height < MIN_SHAPE_PX) {
        setDraft(null);
        return;
      }
      const shape: WhiteboardShape = {
        id: createId("rect"),
        tool: "rectangle",
        stroke: color,
        fill: "none",
        strokeWidth,
        transform: d.transform ?? "",
        geometry: {
          kind: "rectangle",
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
        },
        createdBy: playerId,
        createdAt: Date.now(),
      };
      setDraft(null);
      commitShape(shape);
      return;
    }

    if (d.tool === "ellipse" && d.rx != null && d.ry != null && d.cx != null && d.cy != null) {
      if (d.rx < MIN_SHAPE_PX / 2 || d.ry < MIN_SHAPE_PX / 2) {
        setDraft(null);
        return;
      }
      const shape: WhiteboardShape = {
        id: createId("ellipse"),
        tool: "ellipse",
        stroke: color,
        fill: "none",
        strokeWidth,
        transform: d.transform ?? "",
        geometry: {
          kind: "ellipse",
          cx: d.cx,
          cy: d.cy,
          rx: d.rx,
          ry: d.ry,
        },
        createdBy: playerId,
        createdAt: Date.now(),
      };
      setDraft(null);
      commitShape(shape);
      return;
    }

    if (d.tool === "arrow" && d.start && d.end) {
      if (dist(d.start, d.end) < MIN_SHAPE_PX) {
        setDraft(null);
        return;
      }
      const shape: WhiteboardShape = {
        id: createId("arrow"),
        tool: "arrow",
        stroke: color,
        fill: "none",
        strokeWidth,
        transform: "",
        geometry: { kind: "arrow", start: d.start, end: d.end },
        createdBy: playerId,
        createdAt: Date.now(),
      };
      setDraft(null);
      commitShape(shape);
      return;
    }

    setDraft(null);
  }, [color, strokeWidth, playerId, commitShape, setDraft]);

  const runFill = React.useCallback(
    async (point: Point) => {
      if (isFilling) return;
      setIsFilling(true);
      try {
        const markup = shapesToSvgMarkup(shapes);
        const d = await floodFillToPath({
          width,
          height,
          x: point.x,
          y: point.y,
          fillColor: color,
          tolerance: fillTolerance,
          svgMarkup: markup,
        });
        if (!d) return;
        const shape: WhiteboardShape = {
          id: createId("fill"),
          tool: "fill",
          stroke: color,
          fill: color,
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
      color,
      fillTolerance,
      playerId,
      commitShape,
    ],
  );

  const tryBeginEdit = (p: Point, shape: WhiteboardShape): boolean => {
    const g = shape.geometry;
    const rot = parseRotate(shape.transform);
    const local = rot ? unrotatePoint(p, rot.cx, rot.cy, rot.deg) : p;

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

    if (g.kind === "bezier") {
      if (hitHandle(local, g.cp1)) {
        editModeRef.current = { kind: "bezier", handle: "cp1" };
        return true;
      }
      if (hitHandle(local, g.cp2)) {
        editModeRef.current = { kind: "bezier", handle: "cp2" };
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

    if (!hitTestShapes([shape], p, 14)) return false;
    editModeRef.current = { kind: "move", last: p };
    return true;
  };

  const beginDrawAt = (p: Point) => {
    selectShape(null);
    drawingRef.current = true;
    originRef.current = p;

    if (tool === "fill") {
      drawingRef.current = false;
      void runFill(p);
      return;
    }

    if (tool === "bezier") {
      const handles = defaultBezierHandles(p, p);
      setBezierDraft({
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
      setDraft({ tool: "arrow", start: p, end: p });
    }
  };

  const selectAndDrag = (shape: WhiteboardShape, p: Point) => {
    setTool("select");
    selectShape(shape.id);
    beginShapeUpdate(shape);
    tryBeginEdit(p, shape);
    drawingRef.current = false;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawer || isFilling) return;
    const svg = svgRef.current;
    if (!svg) return;

    e.preventDefault();
    setContextMenu(null);

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
      setDraft(null);
      drawingRef.current = false;
      if (bezierDraft) {
        setBezierDraft(null);
        return;
      }
      const hit = hitTestShapes(shapesRef.current, p, 14);
      if (hit) {
        capturePointer(svg, e.pointerId);
        selectAndDrag(hit, p);
        return;
      }
      // Double-activate on empty canvas deselects
      if (selectedId) {
        selectShape(null);
        return;
      }
    } else {
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
    }

    if (bezierDraft?.editing) {
      if (hitHandle(p, bezierDraft.cp1)) {
        capturePointer(svg, e.pointerId);
        setBezierDraft({ ...bezierDraft, activeHandle: "cp1" });
        return;
      }
      if (hitHandle(p, bezierDraft.cp2)) {
        capturePointer(svg, e.pointerId);
        setBezierDraft({ ...bezierDraft, activeHandle: "cp2" });
        return;
      }
      commitBezierDraft();
      return;
    }

    capturePointer(svg, e.pointerId);

    // Any tool: interact with the current selection (handles / body drag)
    if (selectedShape && tryBeginEdit(p, selectedShape)) {
      setTool("select");
      beginShapeUpdate(selectedShape);
      drawingRef.current = false;
      return;
    }

    // Selection tool: hit-test to select + drag
    if (tool === "select") {
      const hit = hitTestShapes(shapesRef.current, p, 12);
      if (hit) {
        selectAndDrag(hit, p);
        return;
      }
      selectShape(null);
      drawingRef.current = false;
      return;
    }

    // Mobile: delay stroke so a still long-press can select / open menu
    if (isCoarsePointer && tool !== "fill") {
      longPressFiredRef.current = false;
      longPressOriginRef.current = { clientX: e.clientX, clientY: e.clientY, point: p };
      longPressTimerRef.current = setTimeout(() => {
        const origin = longPressOriginRef.current;
        if (!origin) return;
        const hit = hitTestShapes(shapesRef.current, origin.point, 14);
        if (hit) {
          longPressFiredRef.current = true;
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

    // Drawing tools: start a new stroke (deselect first)
    if (selectedId) selectShape(null);
    beginDrawAt(p);
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
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;

    // Cancel long-press if finger moved — and start the deferred stroke
    if (longPressOriginRef.current && !longPressFiredRef.current) {
      const o = longPressOriginRef.current;
      if (Math.hypot(e.clientX - o.clientX, e.clientY - o.clientY) > LONG_PRESS_MOVE_TOL) {
        const start = o.point;
        clearLongPress();
        if (!draft && !bezierDraft && tool !== "select") {
          // Ensure draft state is committed before this move updates geometry.
          flushSync(() => {
            beginDrawAt(start);
          });
        }
      }
    }

    if (longPressFiredRef.current) return;

    const p = clientToSvgPoint(svg, e.clientX, e.clientY);

    const edit = editModeRef.current;
    if (edit && selectedId) {
      const current = shapesRef.current.find((s) => s.id === selectedId);
      if (!current) return;

      if (edit.kind === "move") {
        const dx = p.x - edit.last.x;
        const dy = p.y - edit.last.y;
        if (dx || dy) {
          previewShapeUpdate(translateShape(current, dx, dy));
          editModeRef.current = { kind: "move", last: p };
        }
        return;
      }

      if (edit.kind === "bezier" && current.geometry.kind === "bezier") {
        const g = { ...current.geometry, [edit.handle]: p };
        previewShapeUpdate({ ...current, geometry: g });
        return;
      }

      if (edit.kind === "arrow" && current.geometry.kind === "arrow") {
        const g = { ...current.geometry, [edit.handle]: p };
        previewShapeUpdate({ ...current, geometry: g });
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

    if (bezierDraft) {
      if (!bezierDraft.editing && bezierDraft.activeHandle === "end") {
        const handles = defaultBezierHandles(bezierDraft.start, p);
        setBezierDraft({
          ...bezierDraft,
          end: p,
          cp1: handles.cp1,
          cp2: handles.cp2,
        });
        return;
      }
      if (bezierDraft.activeHandle === "cp1") {
        setBezierDraft({ ...bezierDraft, cp1: p });
        return;
      }
      if (bezierDraft.activeHandle === "cp2") {
        setBezierDraft({ ...bezierDraft, cp2: p });
        return;
      }
      return;
    }

    if (!drawingRef.current || !draft || !originRef.current) return;

    const origin = originRef.current;
    const shift = e.shiftKey;
    const alt = e.altKey;

    if (draft.tool === "rectangle") {
      const box = normalizeRect(origin.x, origin.y, p.x, p.y, shift);
      const skewDeg = alt ? Math.max(-45, Math.min(45, (p.x - origin.x) * 0.15)) : 0;
      setDraft({
        ...draft,
        end: p,
        ...box,
        skewDeg,
        transform: skewTransform(skewDeg, box.x, box.y + box.height / 2),
      });
      return;
    }

    if (draft.tool === "ellipse") {
      const ell = rectToEllipse(origin.x, origin.y, p.x, p.y, shift);
      const rotateDeg = alt
        ? Math.atan2(p.y - origin.y, p.x - origin.x) * (180 / Math.PI)
        : 0;
      setDraft({
        ...draft,
        end: p,
        ...ell,
        rotateDeg,
        transform: rotateTransform(ell.cx, ell.cy, rotateDeg),
      });
      return;
    }

    if (draft.tool === "arrow") {
      setDraft({ ...draft, end: p });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement> | PointerEvent) => {
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
      setDraft(null);
      setBezierDraft(null);
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
        setBezierDraft(null);
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

  return (
    <div
      className={cn(
        "relative min-h-0 overflow-hidden rounded-2xl border border-plum/15 bg-white shadow-inner",
        className,
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className={cn(
          "block h-full w-full touch-none select-none",
          cursorForTool(tool, interactive, editing),
        )}
        role="img"
        aria-label={isDrawer ? "Drawing whiteboard" : "Whiteboard (view only)"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
      >
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        <ShapeList shapes={shapes} selectedId={selectedId} />

        {selectedShape ? <SelectionOverlay shape={selectedShape} /> : null}

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
            fill="none"
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
            fill="none"
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

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
        >
          {statusMessage}
        </div>
      ) : null}

      {bezierDraft?.editing && !statusMessage ? (
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
