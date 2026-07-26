import type { Point, WhiteboardExport, WhiteboardShape } from "./types";
import { WHITEBOARD_VIEWBOX } from "./types";
import { cloneShapes } from "./geometry";
import { buildPencilPathD } from "./pencilStroke";

const GEOMETRY_KINDS = new Set([
  "bezier",
  "rectangle",
  "ellipse",
  "arrow",
  "fill",
  "pencil",
]);

function isPoint(v: unknown): boolean {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { x?: unknown }).x === "number" &&
    typeof (v as { y?: unknown }).y === "number" &&
    Number.isFinite((v as Point).x) &&
    Number.isFinite((v as Point).y)
  );
}

/** True when `d` is a usable SVG path (must start with moveto). */
export function isSvgPathD(value: unknown): value is string {
  return typeof value === "string" && /^[Mm]/.test(value.trim());
}

/**
 * Coerce legacy `{ kind:"pencil", points:[...] }` payloads into the
 * canonical `{ kind:"pencil", d:"M…" }` wire format.
 */
export function coercePencilGeometry(
  geometry: unknown,
): { kind: "pencil"; d: string } | null {
  if (!geometry || typeof geometry !== "object") return null;
  const g = geometry as Record<string, unknown>;
  if (g.kind !== "pencil") return null;

  if (isSvgPathD(g.d)) {
    return { kind: "pencil", d: (g.d as string).trim() };
  }

  if (Array.isArray(g.points)) {
    const pts: Point[] = [];
    for (const raw of g.points) {
      if (!isPoint(raw)) continue;
      pts.push({ x: (raw as Point).x, y: (raw as Point).y });
    }
    if (pts.length === 0) return null;
    const d = buildPencilPathD(pts);
    return isSvgPathD(d) ? { kind: "pencil", d } : null;
  }

  return null;
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
      return isSvgPathD((g as { d?: unknown }).d);
    case "pencil":
      return isSvgPathD((g as { d?: unknown }).d);
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
    Number.isFinite(s.strokeWidth) &&
    typeof s.transform === "string" &&
    typeof s.createdBy === "string" &&
    typeof s.createdAt === "number" &&
    Number.isFinite(s.createdAt) &&
    isValidGeometry(s.geometry)
  );
}

/**
 * Normalize a wire/unknown payload into a WhiteboardShape.
 * Converts legacy pencil `points` → `d`. Returns null if unrecoverable.
 */
export function normalizeShape(value: unknown): WhiteboardShape | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  let geometry = raw.geometry;

  if (
    geometry &&
    typeof geometry === "object" &&
    (geometry as { kind?: unknown }).kind === "pencil"
  ) {
    const coerced = coercePencilGeometry(geometry);
    if (!coerced) return null;
    geometry = coerced;
  }

  // createdAt may arrive as int from some serializers — accept finite numbers only.
  const createdAt = raw.createdAt;
  const strokeWidth = raw.strokeWidth;
  const candidate = {
    ...raw,
    geometry,
    createdAt:
      typeof createdAt === "number"
        ? createdAt
        : typeof createdAt === "string" && createdAt.trim() !== ""
          ? Number(createdAt)
          : createdAt,
    strokeWidth:
      typeof strokeWidth === "number"
        ? strokeWidth
        : typeof strokeWidth === "string" && strokeWidth.trim() !== ""
          ? Number(strokeWidth)
          : strokeWidth,
  };

  return isValidShape(candidate) ? (candidate as WhiteboardShape) : null;
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

/**
 * Import a shape list. Soft-normalizes each entry so one legacy/broken pencil
 * stroke cannot wipe an entire snapshot (previously threw → empty board).
 */
export function importShapes(payload: unknown): WhiteboardShape[] {
  const list: unknown[] | null = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as Partial<WhiteboardExport>).shapes)
      ? ((payload as Partial<WhiteboardExport>).shapes as unknown[])
      : null;

  if (!list) {
    throw new Error("Invalid whiteboard export payload");
  }

  const shapes: WhiteboardShape[] = [];
  for (const item of list) {
    const normalized = normalizeShape(item);
    if (normalized) shapes.push(cloneShape(normalized));
  }

  // Strict mode for completely empty-but-nonempty-input: if every entry was
  // garbage and the list wasn't empty, surface that as invalid.
  if (list.length > 0 && shapes.length === 0) {
    throw new Error("Invalid whiteboard shape list");
  }

  return shapes;
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
  for (const s of remote) {
    const normalized = normalizeShape(s) ?? (isValidShape(s) ? s : null);
    if (normalized) map.set(normalized.id, cloneShape(normalized));
  }
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function cloneShape(shape: WhiteboardShape): WhiteboardShape {
  return structuredClone(shape);
}
