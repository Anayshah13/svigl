/**
 * Cheap client-side drawing change detection.
 *
 * Works directly on the existing vector shape model — no rasterizing, no ML.
 * Path lengths are approximated by treating every coordinate pair in a `d`
 * string as an on-curve point, which slightly overestimates curved segments
 * but is deterministic, O(path length), and plenty for a change heuristic.
 */

import type { WhiteboardShape } from "@/features/whiteboard/types";
import type { AiGuesserConfig } from "./config";
import type { Bounds, DrawingSignature } from "./types";

interface ShapeMetrics {
  points: number;
  length: number;
  bbox: Bounds | null;
  digest: number;
}

const EMPTY_METRICS: ShapeMetrics = {
  points: 0,
  length: 0,
  bbox: null,
  digest: 0,
};

const NUMBER_RE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function growBounds(bbox: Bounds | null, x: number, y: number): Bounds {
  if (bbox === null) return { minX: x, minY: y, maxX: x, maxY: y };
  bbox.minX = Math.min(bbox.minX, x);
  bbox.minY = Math.min(bbox.minY, y);
  bbox.maxX = Math.max(bbox.maxX, x);
  bbox.maxY = Math.max(bbox.maxY, y);
  return bbox;
}

function unionBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (a === null) return b === null ? null : { ...b };
  if (b === null) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function metricsFromPoints(points: number[][]): ShapeMetrics {
  let bbox: Bounds | null = null;
  let length = 0;
  let digest = 0;

  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i];
    bbox = growBounds(bbox, x, y);
    digest += Math.round(x) * 31 + Math.round(y) * 17;
    if (i > 0) {
      const [px, py] = points[i - 1];
      length += Math.hypot(x - px, y - py);
    }
  }

  return { points: points.length, length, bbox, digest };
}

function metricsFromPathD(d: string): ShapeMetrics {
  const matches = d.match(NUMBER_RE);
  if (!matches || matches.length < 2) return EMPTY_METRICS;

  const points: number[][] = [];
  for (let i = 0; i + 1 < matches.length; i += 2) {
    const x = Number(matches[i]);
    const y = Number(matches[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
  }
  return metricsFromPoints(points);
}

function measureShape(shape: WhiteboardShape): ShapeMetrics {
  const g = shape.geometry;
  switch (g.kind) {
    case "pencil":
    case "fill":
      return typeof g.d === "string" ? metricsFromPathD(g.d) : EMPTY_METRICS;
    case "bezier":
      return metricsFromPoints([
        [g.start.x, g.start.y],
        [g.cp1.x, g.cp1.y],
        [g.cp2.x, g.cp2.y],
        [g.end.x, g.end.y],
      ]);
    case "arrow":
      return metricsFromPoints([
        [g.start.x, g.start.y],
        [g.end.x, g.end.y],
      ]);
    case "rectangle":
      return metricsFromPoints([
        [g.x, g.y],
        [g.x + g.width, g.y],
        [g.x + g.width, g.y + g.height],
        [g.x, g.y + g.height],
        [g.x, g.y],
      ]);
    case "ellipse": {
      // Ramanujan-free approximation is fine for a change signal.
      const circumference =
        2 * Math.PI * Math.sqrt((g.rx * g.rx + g.ry * g.ry) / 2);
      return {
        points: 4,
        length: circumference,
        bbox: {
          minX: g.cx - g.rx,
          minY: g.cy - g.ry,
          maxX: g.cx + g.rx,
          maxY: g.cy + g.ry,
        },
        digest:
          Math.round(g.cx) * 31 +
          Math.round(g.cy) * 17 +
          Math.round(g.rx) * 7 +
          Math.round(g.ry) * 3,
      };
    }
    default:
      return EMPTY_METRICS;
  }
}

/**
 * Per-shape metric memo. Shape objects are cloned on every edit, so the cache
 * is keyed by id plus a cheap marker rather than object identity.
 */
export interface ShapeMetricsCache {
  measure(shape: WhiteboardShape): ShapeMetrics;
  clear(): void;
}

/**
 * Cache-invalidation marker. Must be content-sensitive: editing a stroke often
 * preserves the `d` string's length (`400 400` -> `400 410`), so length alone
 * silently serves stale metrics. Comparing the `d` reference/value is cheap —
 * unchanged shapes keep the same string instance, so it is a pointer compare
 * in practice, and differing strings diverge within the first few characters.
 */
function styleKey(shape: WhiteboardShape): string {
  return `${shape.transform}:${shape.stroke}:${shape.fill}:${shape.strokeWidth}`;
}

function shapeMarker(shape: WhiteboardShape): string {
  const g = shape.geometry;
  const style = styleKey(shape);
  if (g.kind === "pencil" || g.kind === "fill") {
    return typeof g.d === "string"
      ? `${g.kind}:${style}:${g.d}`
      : `${g.kind}:${style}:`;
  }
  return `${g.kind}:${style}:${JSON.stringify(g)}`;
}

function hashStyle(shape: WhiteboardShape): number {
  const text = styleKey(shape);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return hash;
}

export function createShapeMetricsCache(): ShapeMetricsCache {
  const cache = new Map<string, { marker: string; metrics: ShapeMetrics }>();
  return {
    measure(shape) {
      const marker = shapeMarker(shape);
      const hit = cache.get(shape.id);
      if (hit && hit.marker === marker) return hit.metrics;
      const metrics = measureShape(shape);
      cache.set(shape.id, { marker, metrics });
      return metrics;
    },
    clear() {
      cache.clear();
    },
  };
}

function hashIds(shapes: WhiteboardShape[]): number {
  let hash = 5381;
  for (const shape of shapes) {
    for (let i = 0; i < shape.id.length; i += 1) {
      hash = ((hash << 5) + hash + shape.id.charCodeAt(i)) | 0;
    }
    hash = (hash * 33) | 0;
  }
  return hash;
}

export function emptySignature(): DrawingSignature {
  return {
    shapeCount: 0,
    pointCount: 0,
    totalLength: 0,
    bbox: null,
    digest: 0,
    fingerprint: "0:0:0:0:0",
  };
}

export function summarizeShapes(
  shapes: WhiteboardShape[],
  cache?: ShapeMetricsCache,
): DrawingSignature {
  if (shapes.length === 0) return emptySignature();

  const measurer = cache ?? createShapeMetricsCache();
  let pointCount = 0;
  let totalLength = 0;
  let digest = 0;
  let bbox: Bounds | null = null;

  for (const shape of shapes) {
    const m = measurer.measure(shape);
    pointCount += m.points;
    totalLength += m.length;
    digest = (digest + m.digest + hashStyle(shape)) | 0;
    bbox = unionBounds(bbox, m.bbox);
  }

  const fingerprint = [
    shapes.length,
    pointCount,
    Math.round(totalLength),
    digest,
    hashIds(shapes),
  ].join(":");

  return { shapeCount: shapes.length, pointCount, totalLength, bbox, digest, fingerprint };
}

export function isEmptySignature(signature: DrawingSignature): boolean {
  return signature.shapeCount === 0 || signature.pointCount === 0;
}

export function signaturesEqual(
  a: DrawingSignature | null,
  b: DrawingSignature | null,
): boolean {
  if (a === null || b === null) return a === b;
  return a.fingerprint === b.fingerprint;
}

function diagonal(bbox: Bounds | null): number {
  if (bbox === null) return 0;
  return Math.hypot(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
}

function bboxGrowthScore(
  prev: Bounds | null,
  next: Bounds | null,
  saturation: number,
): number {
  if (next === null) return 0;
  if (prev === null) return 1;

  const prevDiag = diagonal(prev);
  const nextDiag = diagonal(next);
  const union = unionBounds({ ...prev }, next);
  const unionDiag = diagonal(union);

  // Growth relative to what was already there — covers both expansion and
  // drawing in a previously empty region.
  const base = Math.max(prevDiag, 1);
  const growth = Math.max(nextDiag - prevDiag, unionDiag - prevDiag) / base;
  return clamp01(growth / Math.max(saturation, 1e-6));
}

/**
 * How much new visual information appeared since the reference signature.
 * Returns 0 (nothing changed) .. 1 (definitely worth another look).
 */
export function changeScore(
  prev: DrawingSignature | null,
  next: DrawingSignature,
  config: AiGuesserConfig,
): number {
  if (isEmptySignature(next)) return 0;
  if (prev === null) return 1;
  if (prev.fingerprint === next.fingerprint) return 0;

  const addedShapes = Math.max(0, next.shapeCount - prev.shapeCount);
  const addedLength = Math.max(0, next.totalLength - prev.totalLength);

  const shapeScore = addedShapes / Math.max(config.NEW_SHAPE_SATURATION, 1e-6);
  const lengthScore = addedLength / Math.max(config.NEW_LENGTH_SATURATION, 1e-6);
  const bboxScore = bboxGrowthScore(
    prev.bbox,
    next.bbox,
    config.BBOX_GROWTH_SATURATION,
  );

  const additive = Math.max(shapeScore, lengthScore, bboxScore);
  if (additive > 0) return clamp01(additive);

  // Ink was erased, moved, or resized rather than added — still a change.
  return clamp01(config.STRUCTURAL_CHANGE_SCORE);
}
