"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  arrowHeadPoints,
  arrowShaftEnd,
  createId,
  defaultBezierHandles,
  dist,
  normalizeRect,
  rectToEllipse,
  rotateTransform,
  skewTransform,
} from "./geometry";
import { floodFillToPath } from "./floodFill";
import {
  BezierDraftOverlay,
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
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

function hitHandle(
  p: Point,
  handle: Point,
  radius = 10,
): boolean {
  return dist(p, handle) <= radius;
}

function shapesToSvgMarkup(shapes: WhiteboardShape[]): string {
  const { width, height } = WHITEBOARD_VIEWBOX;
  // Serialize committed shapes into a standalone SVG for raster flood-fill.
  // Keep this simple — fill only needs opaque paint boundaries.
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
    isDrawer,
    isFilling,
    commitShape,
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
  const draftRef = React.useRef(draft);
  draftRef.current = draft;

  const { width, height } = WHITEBOARD_VIEWBOX;

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

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawer || isFilling) return;
    const svg = svgRef.current;
    if (!svg) return;

    // Commit pending bezier if clicking empty space (not on handles)
    if (bezierDraft?.editing) {
      const p = clientToSvgPoint(svg, e.clientX, e.clientY);
      if (hitHandle(p, bezierDraft.cp1)) {
        pointerIdRef.current = e.pointerId;
        svg.setPointerCapture(e.pointerId);
        setBezierDraft({ ...bezierDraft, activeHandle: "cp1" });
        return;
      }
      if (hitHandle(p, bezierDraft.cp2)) {
        pointerIdRef.current = e.pointerId;
        svg.setPointerCapture(e.pointerId);
        setBezierDraft({ ...bezierDraft, activeHandle: "cp2" });
        return;
      }
      // Click elsewhere commits
      commitBezierDraft();
      return;
    }

    const p = clientToSvgPoint(svg, e.clientX, e.clientY);
    pointerIdRef.current = e.pointerId;
    svg.setPointerCapture(e.pointerId);
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

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg && pointerIdRef.current !== null) {
      try {
        svg.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* already released */
      }
    }
    pointerIdRef.current = null;

    if (bezierDraft && !bezierDraft.editing) {
      // Enter handle-edit mode after initial drag
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

  const interactive = isDrawer && !isFilling;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-plum/15 bg-white shadow-inner",
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
        )}
        role="img"
        aria-label={isDrawer ? "Drawing whiteboard" : "Whiteboard (view only)"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        <ShapeList shapes={shapes} />

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
