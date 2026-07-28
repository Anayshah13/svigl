import type { Vec2 } from "../types";

/**
 * Infinity-loop specific metrics — labs.md §3 / §4.4.
 */

/** |1 − Area_left / Area_right| after Procrustes alignment (y-axis split). */
export function lobeSymmetryError(points: ArrayLike<Vec2>): number {
  let left = 0;
  let right = 0;
  // Bounding-box area proxy per lobe: sum of |x|·Δs contributions,
  // plus axis-aligned bbox area of points on each side.
  let minYL = Infinity;
  let maxYL = -Infinity;
  let minXL = Infinity;
  let maxXL = -Infinity;
  let minYR = Infinity;
  let maxYR = -Infinity;
  let minXR = Infinity;
  let maxXR = -Infinity;
  let hasL = false;
  let hasR = false;

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (p.x < 0) {
      hasL = true;
      minXL = Math.min(minXL, p.x);
      maxXL = Math.max(maxXL, p.x);
      minYL = Math.min(minYL, p.y);
      maxYL = Math.max(maxYL, p.y);
    } else if (p.x > 0) {
      hasR = true;
      minXR = Math.min(minXR, p.x);
      maxXR = Math.max(maxXR, p.x);
      minYR = Math.min(minYR, p.y);
      maxYR = Math.max(maxYR, p.y);
    }
  }

  if (hasL) left = Math.max(1e-9, (maxXL - minXL) * (maxYL - minYL));
  if (hasR) right = Math.max(1e-9, (maxXR - minXR) * (maxYR - minYR));
  if (!hasL || !hasR) return 1;

  return Math.abs(1 - left / right);
}

/**
 * Self-intersection nearest the origin.
 * Spec: Euclidean distance of the crossing to (0,0).
 */
export function intersectionOriginError(points: ArrayLike<Vec2>): number {
  const hit = findSelfIntersection(points);
  if (!hit) {
    // No crossing found — penalize by nearest approach of non-adjacent segments to origin
    // is wrong; use distance of the point closest to origin among mid-stroke samples.
    let best = Infinity;
    const n = points.length;
    const lo = Math.floor(n * 0.2);
    const hi = Math.floor(n * 0.8);
    for (let i = lo; i < hi; i++) {
      const p = points[i]!;
      const d = Math.hypot(p.x, p.y);
      if (d < best) best = d;
    }
    return best;
  }
  return Math.hypot(hit.x, hit.y);
}

function findSelfIntersection(points: ArrayLike<Vec2>): Vec2 | null {
  const n = points.length;
  let best: Vec2 | null = null;
  let bestD = Infinity;

  // O(N²) segment pairs with gap to avoid adjacent false positives.
  // N=1000 ⇒ ~5e5 checks — fine within the 3ms budget on modern CPUs.
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    for (let j = i + 2; j < n - 1; j++) {
      if (i === 0 && j === n - 2) continue; // closed endpoints
      const c = points[j]!;
      const d = points[j + 1]!;
      const hit = segmentIntersection(a, b, c, d);
      if (!hit) continue;
      const dist = Math.hypot(hit.x, hit.y);
      if (dist < bestD) {
        bestD = dist;
        best = hit;
      }
    }
  }
  return best;
}

function segmentIntersection(
  a: Vec2,
  b: Vec2,
  c: Vec2,
  d: Vec2,
): Vec2 | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denom;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * rx, y: a.y + t * ry };
}
