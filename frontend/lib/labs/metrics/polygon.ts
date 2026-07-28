import type { Vec2 } from "../types";
import { dist, perpDistToLine, variance } from "../utils/math";

export type PolygonMetrics = {
  angleError: number;
  straightness: number;
  sideEquality: number;
  sideLengths: number[];
  angles: number[];
};

/**
 * Polygon structural metrics — labs.md §3 / §4.2–4.3.
 * Corners from dynamic RDP; edges fitted with orthogonal distances to
 * the chord (OLS line through consecutive vertices).
 */
export function computePolygonMetrics(
  stroke: Vec2[],
  cornerIndices: number[],
  idealAngleRad: number,
): PolygonMetrics {
  const m = cornerIndices.length;
  if (m < 3) {
    return {
      angleError: Math.PI,
      straightness: 1,
      sideEquality: 1,
      sideLengths: [],
      angles: [],
    };
  }

  const corners = cornerIndices.map((i) => stroke[i]!);
  const angles: number[] = [];
  const sideLengths: number[] = [];

  for (let i = 0; i < m; i++) {
    const prev = corners[(i - 1 + m) % m]!;
    const cur = corners[i]!;
    const next = corners[(i + 1) % m]!;
    angles.push(interiorAngle(prev, cur, next));
    sideLengths.push(dist(cur, next));
  }

  // Mean absolute deviation from the ideal interior angle.
  let angleErr = 0;
  for (const a of angles) {
    angleErr += Math.abs(a - idealAngleRad);
  }
  angleErr /= angles.length;

  // Edge straightness: RMS orthogonal distance of inter-vertex samples to chord.
  let straightSumSq = 0;
  let straightCount = 0;
  for (let i = 0; i < m; i++) {
    const i0 = cornerIndices[i]!;
    const i1 = cornerIndices[(i + 1) % m]!;
    const a = stroke[i0]!;
    const b = stroke[i1]!;
    const [lo, hi] = i1 > i0 ? [i0, i1] : [i0, stroke.length - 1];
    for (let j = lo + 1; j < hi; j++) {
      const d = perpDistToLine(stroke[j]!, a, b);
      straightSumSq += d * d;
      straightCount++;
    }
    // Wrap-around segment when polygon closes across the array end.
    if (i1 <= i0) {
      for (let j = 0; j < i1; j++) {
        const d = perpDistToLine(stroke[j]!, a, b);
        straightSumSq += d * d;
        straightCount++;
      }
    }
  }
  const straightness =
    straightCount > 0 ? Math.sqrt(straightSumSq / straightCount) : 0;

  // Isotropic variance of side lengths (rectangle vs square discrimination).
  const sideEquality = variance(sideLengths);

  return {
    angleError: angleErr,
    straightness,
    sideEquality,
    sideLengths,
    angles,
  };
}

/** Interior angle at `cur` given previous/next vertices (radians, ∈ (0, π]). */
export function interiorAngle(prev: Vec2, cur: Vec2, next: Vec2): number {
  const ax = prev.x - cur.x;
  const ay = prev.y - cur.y;
  const bx = next.x - cur.x;
  const by = next.y - cur.y;
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (la < 1e-12 || lb < 1e-12) return Math.PI;
  const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  return Math.acos(cos);
}
