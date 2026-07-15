"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  arrowHeadPoints,
  arrowShaftEnd,
  createId,
  defaultBezierHandles,
  dist,
  ellipseHandles,
  hitCorner,
  hitTestShapes,
  normalizeRect,
  parseRotate,
  rectCorners,
  rectToEllipse,
  resizeEllipseFromCorner,
  resizeRectFromCorner,
  rotateTransform,
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
import type { WhiteboardController } from "./useWhiteboard";
import {
  WHITEBOARD_VIEWBOX,
  type Point,
  type WhiteboardShape,
} from "./types";

function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const inverse = ctm.inverse();
  // DOMPoint is more reliable than createSVGPoint under iOS Safari zoom.
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
          const shaft = arrowShaftEnd(g.start, g.end, Math.max(10, s.strokeWidth * 2.5));
          const head = arrowHeadPoints(g.start, g.end, Math.max(10, s.strokeWidth * 2.5));
          return `<g${t}><line x1="${g.start.x}" y1="${g.start.y}" x2="${shaft.x}" y2="${shaft.y}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round"/><polygon points="${head}" fill="${s.stroke}"/></g>`;
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

type EditMode =
  | { kind: "move"; last: Point }
  | { kind: "bezier"; handle: "start" | "end" | "cp1" | "cp2" }
  | { kind: "arrow"; handle: "start" | "end" }
  | { kind: "rect-resize"; corner: RectCorner }
  | { kind: "ellipse-resize"; corner: RectCorner };

export interface WhiteboardCanvasProps {
  controller: WhiteboardController;
  className?: string;
}

export function WhiteboardCanvas({ controller, className }: WhiteboardCanvasProps) {
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
  } = controller;

  const svgRef = React.useRef<SVGSVGElement>(null);
  const drawingRef = React.useRef(false);
  const originRef = React.useRef<Point | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);
  const windowListenersRef = React.useRef(false);
  const draftRef = React.useRef(draft);
  draftRef.current = draft;

  const capturePointer = (svg: SVGSVGElement, pointerId: number) => {
    pointerIdRef.current = pointerId;
    try {
      svg.setPointerCapture(pointerId);
    } catch {
      // iOS Safari can fail setPointerCapture on SVG — window listeners cover it.
    }
  };
  const editModeRef = React.useRef<EditMode | null>(null);
  const shapesRef = React.useRef(shapes);
  shapesRef.current = shapes;

  const { width, height } = WHITEBOARD_VIEWBOX;

  const selectedShape = selectedId
    ? shapes.find((s) => s.id === selectedId) ?? null
    : null;

  const finishShapeDrag = React.useCallback(() => {
    const d = draftRef.current;
    if (!d) return;

    if (d.tool === "rectangle" && d.width != null && d.height != null && d.x != null && d.y != null) {
      if (d.width < 1 && d.height < 1) {
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
          width: Math.max(d.width, 1),
          height: Math.max(d.height, 1),
        },
        createdBy: playerId,
        createdAt: Date.now(),
      };
      setDraft(null);
      commitShape(shape);
      return;
    }

    if (d.tool === "ellipse" && d.rx != null && d.ry != null && d.cx != null && d.cy != null) {
      if (d.rx < 0.5 && d.ry < 0.5) {
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
          rx: Math.max(d.rx, 0.5),
          ry: Math.max(d.ry, 0.5),
        },
        createdBy: playerId,
        createdAt: Date.now(),
      };
      setDraft(null);
      commitShape(shape);
      return;
    }

    if (d.tool === "arrow" && d.start && d.end) {
      if (dist(d.start, d.end) < 4) {
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

    if (g.kind === "bezier") {
      if (hitHandle(p, g.cp1)) {
        editModeRef.current = { kind: "bezier", handle: "cp1" };
        return true;
      }
      if (hitHandle(p, g.cp2)) {
        editModeRef.current = { kind: "bezier", handle: "cp2" };
        return true;
      }
      if (hitHandle(p, g.start)) {
        editModeRef.current = { kind: "bezier", handle: "start" };
        return true;
      }
      if (hitHandle(p, g.end)) {
        editModeRef.current = { kind: "bezier", handle: "end" };
        return true;
      }
      editModeRef.current = { kind: "move", last: p };
      return true;
    }

    if (g.kind === "arrow") {
      if (hitHandle(p, g.start)) {
        editModeRef.current = { kind: "arrow", handle: "start" };
        return true;
      }
      if (hitHandle(p, g.end)) {
        editModeRef.current = { kind: "arrow", handle: "end" };
        return true;
      }
      editModeRef.current = { kind: "move", last: p };
      return true;
    }

    if (g.kind === "rectangle") {
      const corner = hitCorner(local, rectCorners(g), 14);
      if (corner) {
        editModeRef.current = { kind: "rect-resize", corner };
        return true;
      }
      editModeRef.current = { kind: "move", last: p };
      return true;
    }

    if (g.kind === "ellipse") {
      const corner = hitCorner(local, ellipseHandles(g), 14);
      if (corner) {
        editModeRef.current = { kind: "ellipse-resize", corner };
        return true;
      }
      editModeRef.current = { kind: "move", last: p };
      return true;
    }

    if (g.kind === "fill") {
      editModeRef.current = { kind: "move", last: p };
      return true;
    }

    return false;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawer || isFilling) return;
    const svg = svgRef.current;
    if (!svg) return;

    // Prevent iOS Safari from scrolling/zooming while drawing.
    e.preventDefault();

    // Commit pending bezier if clicking empty space (not on handles)
    if (bezierDraft?.editing) {
      const p = clientToSvgPoint(svg, e.clientX, e.clientY);
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

    const p = clientToSvgPoint(svg, e.clientX, e.clientY);
    capturePointer(svg, e.pointerId);

    // Editing an already-selected shape takes priority
    if (selectedShape && selectedShape.id === selectedId) {
      if (tryBeginEdit(p, selectedShape)) {
        beginShapeUpdate(selectedShape);
        drawingRef.current = false;
        return;
      }
    }

    // Hit-test existing shapes (select instead of drawing) — skip for fill tool
    if (tool !== "fill") {
      const hit = hitTestShapes(shapesRef.current, p, 12);
      if (hit) {
        selectShape(hit.id);
        beginShapeUpdate(hit);
        tryBeginEdit(p, hit);
        drawingRef.current = false;
        return;
      }
    }

    // Empty canvas: deselect and start a new stroke
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

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawer) return;
    const svg = svgRef.current;
    if (!svg) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;

    const p = clientToSvgPoint(svg, e.clientX, e.clientY);

    // Live edit of selected shape
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

      if (edit.kind === "rect-resize" && current.geometry.kind === "rectangle") {
        const rot = parseRotate(current.transform);
        const local = rot ? unrotatePoint(p, rot.cx, rot.cy, rot.deg) : p;
        const box = resizeRectFromCorner(current.geometry, edit.corner, local, e.shiftKey);
        let transform = current.transform;
        if (e.altKey) {
          const skewDeg = Math.max(-45, Math.min(45, (local.x - current.geometry.x) * 0.15));
          transform = skewTransform(skewDeg, box.x, box.y + box.height / 2);
        } else if (rot) {
          transform = rotateTransform(
            box.x + box.width / 2,
            box.y + box.height / 2,
            rot.deg,
          );
        }
        previewShapeUpdate({
          ...current,
          transform,
          geometry: { kind: "rectangle", ...box },
        });
        return;
      }

      if (edit.kind === "ellipse-resize" && current.geometry.kind === "ellipse") {
        const rot = parseRotate(current.transform);
        const local = rot ? unrotatePoint(p, rot.cx, rot.cy, rot.deg) : p;
        const ell = resizeEllipseFromCorner(current.geometry, edit.corner, local, e.shiftKey);
        let transform = current.transform;
        if (e.altKey) {
          const rotateDeg =
            Math.atan2(local.y - ell.cy, local.x - ell.cx) * (180 / Math.PI);
          transform = rotateTransform(ell.cx, ell.cy, rotateDeg);
        } else if (rot) {
          transform = rotateTransform(ell.cx, ell.cy, rot.deg);
        }
        previewShapeUpdate({
          ...current,
          transform,
          geometry: { kind: "ellipse", ...ell },
        });
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
    // Already finished (SVG + window listeners can both fire).
    if (pointerIdRef.current === null) return;
    if ("pointerId" in e && e.pointerId !== pointerIdRef.current) return;

    const svg = svgRef.current;
    if (svg && pointerIdRef.current !== null) {
      try {
        svg.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* already released */
      }
    }
    pointerIdRef.current = null;

    if (editModeRef.current) {
      editModeRef.current = null;
      commitShapeUpdate();
      return;
    }

    if (bezierDraft && !bezierDraft.editing) {
      if (dist(bezierDraft.start, bezierDraft.end) < 4) {
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

  const onPointerMoveRef = React.useRef(onPointerMove);
  const onPointerUpRef = React.useRef(onPointerUp);
  onPointerMoveRef.current = onPointerMove;
  onPointerUpRef.current = onPointerUp;

  // Window-level pointer fallback when SVG setPointerCapture fails (common on iPad).
  React.useEffect(() => {
    if (windowListenersRef.current) return;

    const onMove = (event: PointerEvent) => {
      if (pointerIdRef.current === null) return;
      if (event.pointerId !== pointerIdRef.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      // Avoid double-handling when SVG capture is working.
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
          interactive ? "cursor-crosshair" : "cursor-default",
          tool === "fill" && interactive ? "cursor-cell" : null,
          selectedId && interactive ? "cursor-default" : null,
        )}
        role="img"
        aria-label={isDrawer ? "Drawing whiteboard" : "Whiteboard (view only)"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        <ShapeList shapes={shapes} selectedId={selectedId} />

        {selectedShape ? <SelectionOverlay shape={selectedShape} /> : null}

        {/* Live drafts */}
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
              x2={arrowShaftEnd(draft.start, draft.end, Math.max(10, strokeWidth * 2.5)).x}
              y2={arrowShaftEnd(draft.start, draft.end, Math.max(10, strokeWidth * 2.5)).y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <polygon
              points={arrowHeadPoints(
                draft.start,
                draft.end,
                Math.max(10, strokeWidth * 2.5),
              )}
              fill={color}
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

      {bezierDraft?.editing ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
          Drag handles · Enter to commit · Esc to cancel
        </div>
      ) : null}

      {selectedShape && !bezierDraft ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
          Drag to move · handles to edit · Esc to deselect
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
          View only
        </div>
      ) : null}
    </div>
  );
}
