"use client";

// Local-only SVG drawing surface for the frontend prototype.
// Shapes are stored in the document store — no networking or persistence.

import * as React from "react";
import {
  CANVAS_VIEWBOX,
  ColorPalette,
  type CircleShape,
  type DrawingTool,
  type PathNode,
  type PathShape,
  type RectangleShape,
  type Shape,
  type Style,
} from "@/types/drawing";
import { useDocumentStore } from "@/stores/document";
import { useSessionStore } from "@/stores/session";
import {
  buildPathShape,
  makePathNode,
  pathDFromNodes,
  pathLength,
  smoothPathNodes,
} from "./pathUtils";
import { SvgRenderer } from "./SvgRenderer";

const DEFAULT_STYLE: Style = {
  strokeColor: ColorPalette[0],
  strokeWidth: 2,
  fillColor: "none",
  opacity: 1,
};

const MIN_PATH_NODE_DIST = 4;
const MIN_PATH_LENGTH = 10;

function toViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_VIEWBOX.width,
    y: ((clientY - rect.top) / rect.height) * CANVAS_VIEWBOX.height,
  };
}

function buildShape(
  tool: DrawingTool,
  id: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  createdBy: string,
  style: Style,
): RectangleShape | CircleShape | null {
  const now = Date.now();
  if (tool === "rectangle") {
    return {
      id,
      type: "rectangle",
      geometry: {
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        width: Math.abs(x1 - x0),
        height: Math.abs(y1 - y0),
      },
      style,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
  }
  if (tool === "circle") {
    return {
      id,
      type: "circle",
      geometry: {
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        radius: Math.hypot(x1 - x0, y1 - y0) / 2,
      },
      style,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
  }
  return null;
}

function isSignificant(shape: Shape): boolean {
  if (shape.type === "rectangle") {
    return shape.geometry.width > 3 && shape.geometry.height > 3;
  }
  if (shape.type === "circle") {
    return shape.geometry.radius > 3;
  }
  if (shape.type === "path") {
    return pathLength(shape.geometry.nodes) >= MIN_PATH_LENGTH;
  }
  return false;
}

interface PreviewLayerProps {
  previews: Record<string, Partial<Shape>>;
}

function PreviewLayer({ previews }: PreviewLayerProps) {
  return (
    <>
      {Object.entries(previews).map(([id, preview]) => {
        if (!preview.type || !preview.geometry) return null;
        const s = preview.style ?? DEFAULT_STYLE;
        const dashArray = "6 4";

        if (preview.type === "rectangle") {
          const g = preview.geometry as RectangleShape["geometry"];
          return (
            <rect
              key={id}
              x={g.x}
              y={g.y}
              width={g.width}
              height={g.height}
              stroke={s.strokeColor}
              strokeWidth={s.strokeWidth}
              strokeDasharray={dashArray}
              fill={s.fillColor}
              opacity={0.75}
              pointerEvents="none"
            />
          );
        }

        if (preview.type === "circle") {
          const g = preview.geometry as CircleShape["geometry"];
          return (
            <circle
              key={id}
              cx={g.cx}
              cy={g.cy}
              r={g.radius}
              stroke={s.strokeColor}
              strokeWidth={s.strokeWidth}
              strokeDasharray={dashArray}
              fill={s.fillColor}
              opacity={0.75}
              pointerEvents="none"
            />
          );
        }

        if (preview.type === "path") {
          const g = preview.geometry as PathShape["geometry"];
          return (
            <path
              key={id}
              d={pathDFromNodes(g.nodes)}
              stroke={s.strokeColor}
              strokeWidth={s.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashArray}
              fill={s.fillColor}
              opacity={0.75}
              pointerEvents="none"
            />
          );
        }

        return null;
      })}
    </>
  );
}

interface DragState {
  shapeId: string;
  startX: number;
  startY: number;
}

interface PathDragState {
  shapeId: string;
  nodes: PathNode[];
}

export interface DrawingCanvasProps {
  isDrawer?: boolean;
  activeStyle?: Partial<Style>;
  className?: string;
}

export function DrawingCanvas({
  isDrawer = true,
  activeStyle,
  className,
}: DrawingCanvasProps) {
  const document = useDocumentStore((s) => s.document);
  const tool = useDocumentStore((s) => s.tool);
  const previews = useDocumentStore((s) => s.previews);
  const setPreview = useDocumentStore((s) => s.setPreview);
  const clearPreview = useDocumentStore((s) => s.clearPreview);
  const commitLocal = useDocumentStore((s) => s.commitLocal);
  const selfId = useSessionStore((s) => s.selfId);

  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const pathDragRef = React.useRef<PathDragState | null>(null);

  const style: Style = { ...DEFAULT_STYLE, ...activeStyle };
  const creatorId = selfId ?? "local-user";

  const activeTool: DrawingTool | null =
    isDrawer && (tool === "rectangle" || tool === "circle" || tool === "path") ? tool : null;

  const previewPath = (shapeId: string, nodes: PathNode[]) => {
    const smoothed = smoothPathNodes(nodes);
    const preview: Partial<PathShape> = {
      type: "path",
      geometry: { nodes: smoothed },
      style,
    };
    setPreview(shapeId, preview);
    return preview;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeTool || !svgRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toViewBox(svgRef.current, e.clientX, e.clientY);
    const shapeId = `${creatorId}-${Date.now()}`;

    if (activeTool === "path") {
      pathDragRef.current = { shapeId, nodes: [makePathNode(x, y)] };
      previewPath(shapeId, pathDragRef.current.nodes);
      return;
    }

    dragRef.current = { shapeId, startX: x, startY: y };
    const shape = buildShape(activeTool, shapeId, x, y, x, y, creatorId, style);
    if (shape) setPreview(shapeId, shape);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeTool || !svgRef.current) return;
    const { x, y } = toViewBox(svgRef.current, e.clientX, e.clientY);

    if (activeTool === "path") {
      const pathDrag = pathDragRef.current;
      if (!pathDrag) return;
      const last = pathDrag.nodes[pathDrag.nodes.length - 1];
      if (Math.hypot(x - last.position.x, y - last.position.y) < MIN_PATH_NODE_DIST) return;

      pathDrag.nodes = [...pathDrag.nodes, makePathNode(x, y)];
      previewPath(pathDrag.shapeId, pathDrag.nodes);
      return;
    }

    if (!dragRef.current) return;
    const { shapeId, startX, startY } = dragRef.current;
    const shape = buildShape(activeTool, shapeId, startX, startY, x, y, creatorId, style);
    if (shape) setPreview(shapeId, shape);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeTool || !svgRef.current) return;
    const { x, y } = toViewBox(svgRef.current, e.clientX, e.clientY);

    if (activeTool === "path") {
      const pathDrag = pathDragRef.current;
      pathDragRef.current = null;
      if (!pathDrag) return;
      clearPreview(pathDrag.shapeId);

      const last = pathDrag.nodes[pathDrag.nodes.length - 1];
      const nodes =
        Math.hypot(x - last.position.x, y - last.position.y) >= MIN_PATH_NODE_DIST
          ? [...pathDrag.nodes, makePathNode(x, y)]
          : pathDrag.nodes;

      const shape = buildPathShape(pathDrag.shapeId, nodes, creatorId, style);
      if (isSignificant(shape)) commitLocal(shape);
      return;
    }

    if (!dragRef.current) return;
    const { shapeId, startX, startY } = dragRef.current;
    dragRef.current = null;
    clearPreview(shapeId);

    const shape = buildShape(activeTool, shapeId, startX, startY, x, y, creatorId, style);
    if (shape && isSignificant(shape)) commitLocal(shape);
  };

  const handlePointerCancel = () => {
    if (pathDragRef.current) {
      clearPreview(pathDragRef.current.shapeId);
      pathDragRef.current = null;
    }
    if (dragRef.current) {
      clearPreview(dragRef.current.shapeId);
      dragRef.current = null;
    }
  };

  return (
    <SvgRenderer
      ref={svgRef}
      document={document}
      className={className}
      style={activeTool ? { cursor: "crosshair" } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
    >
      <PreviewLayer previews={previews} />
    </SvgRenderer>
  );
}
