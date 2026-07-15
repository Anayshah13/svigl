import type { WhiteboardExport, WhiteboardShape } from "./types";
import { WHITEBOARD_VIEWBOX } from "./types";
import { cloneShapes } from "./geometry";

const GEOMETRY_KINDS = new Set([
  "bezier",
  "rectangle",
  "ellipse",
  "arrow",
  "fill",
]);

function isPoint(v: unknown): boolean {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { x?: unknown }).x === "number" &&
    typeof (v as { y?: unknown }).y === "number"
  );
}

function isValidGeometry(g: unknown): boolean {
  if (!g || typeof g !== "object") return false;
  const kind = (g as { kind?: unknown }).kind;
  if (typeof kind !== "string" || !GEOMETRY_KINDS.has(kind)) return false;
  switch (kind) {
    case "bezier": {
      const b = g as Record<string, unknown>;
      return isPoint(b.start) && isPoint(b.end) && isPoint(b.cp1) && isPoint(b.cp2);
    }
    case "rectangle": {
      const r = g as Record<string, unknown>;
      return (
        typeof r.x === "number" &&
        typeof r.y === "number" &&
        typeof r.width === "number" &&
        typeof r.height === "number"
      );
    }
    case "ellipse": {
      const e = g as Record<string, unknown>;
      return (
        typeof e.cx === "number" &&
        typeof e.cy === "number" &&
        typeof e.rx === "number" &&
        typeof e.ry === "number"
      );
    }
    case "arrow": {
      const a = g as Record<string, unknown>;
      return isPoint(a.start) && isPoint(a.end);
    }
    case "fill":
      return typeof (g as { d?: unknown }).d === "string";
    default:
      return false;
  }
}

export function isValidShape(value: unknown): value is WhiteboardShape {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.tool === "string" &&
    typeof s.stroke === "string" &&
    (typeof s.fill === "string" || s.fill === "none") &&
    typeof s.strokeWidth === "number" &&
    typeof s.transform === "string" &&
    typeof s.createdBy === "string" &&
    typeof s.createdAt === "number" &&
    isValidGeometry(s.geometry)
  );
}

/** Export shape list for network sync / persistence. */
export function exportShapes(shapes: WhiteboardShape[]): WhiteboardExport {
  return {
    version: 1,
    viewBox: WHITEBOARD_VIEWBOX,
    shapes: cloneShapes(shapes),
    exportedAt: Date.now(),
  };
}

export function exportShapesJson(shapes: WhiteboardShape[]): string {
  return JSON.stringify(exportShapes(shapes));
}

/** Import a shape list; rejects malformed payloads. */
export function importShapes(payload: unknown): WhiteboardShape[] {
  if (Array.isArray(payload)) {
    if (!payload.every(isValidShape)) {
      throw new Error("Invalid whiteboard shape list");
    }
    return cloneShapes(payload);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid whiteboard export payload");
  }

  const doc = payload as Partial<WhiteboardExport>;
  if (!Array.isArray(doc.shapes) || !doc.shapes.every(isValidShape)) {
    throw new Error("Invalid whiteboard export shapes");
  }
  return cloneShapes(doc.shapes);
}

export function importShapesJson(json: string): WhiteboardShape[] {
  return importShapes(JSON.parse(json) as unknown);
}

/** Merge remote shapes by id (last-write-wins on id collision). */
export function mergeShapesById(
  local: WhiteboardShape[],
  remote: WhiteboardShape[],
): WhiteboardShape[] {
  const map = new Map<string, WhiteboardShape>();
  for (const s of local) map.set(s.id, cloneShape(s));
  for (const s of remote) map.set(s.id, cloneShape(s));
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function cloneShape(shape: WhiteboardShape): WhiteboardShape {
  return structuredClone(shape);
}
