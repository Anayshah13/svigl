import {
  RDP_BINARY_SEARCH_ITERS,
  RDP_EPS_MAX,
  RDP_EPS_MIN,
} from "../config/global";
import type { Vec2 } from "../types";
import { perpDistToLine } from "../utils/math";

/**
 * Classic Ramer–Douglas–Peucker — labs.md §8.2.
 * Returns indices of kept points (always includes 0 and n-1).
 */
export function rdpIndices(points: ArrayLike<Vec2>, epsilon: number): number[] {
  const n = points.length;
  if (n <= 2) {
    const all: number[] = [];
    for (let i = 0; i < n; i++) all.push(i);
    return all;
  }

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    let maxIdx = -1;
    let maxDist = 0;
    const a = points[lo]!;
    const b = points[hi]!;
    for (let i = lo + 1; i < hi; i++) {
      const d = perpDistToLine(points[i]!, a, b);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx !== -1 && maxDist > epsilon) {
      keep[maxIdx] = 1;
      stack.push([lo, maxIdx], [maxIdx, hi]);
    }
  }

  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(i);
  }
  return out;
}

export function ramerDouglasPeucker(points: Vec2[], epsilon: number): Vec2[] {
  return rdpIndices(points, epsilon).map((i) => points[i]!);
}

export type DynamicRdpResult = {
  vertices: Vec2[];
  /** Indices into the original polyline (deduped closed). */
  indices: number[];
  epsilon: number;
  found: boolean;
};

/**
 * Binary-search ε until RDP returns exactly `targetVertices` corners.
 * Spec §8.2 / §10: 20 iterations, ε ∈ [0, 2] in RMS space.
 */
export function dynamicRdpCorners(
  points: Vec2[],
  targetVertices: number,
  iterations: number = RDP_BINARY_SEARCH_ITERS,
): DynamicRdpResult {
  let minEps = RDP_EPS_MIN;
  let maxEps = RDP_EPS_MAX;
  let bestIdx: number[] = [];
  let bestEps = maxEps;
  let found = false;

  for (let iter = 0; iter < iterations; iter++) {
    const eps = (minEps + maxEps) / 2;
    const idx = rdpIndices(points, eps);
    const count = uniqueCornerCount(points, idx);

    if (count > targetVertices) {
      minEps = eps;
    } else if (count < targetVertices) {
      maxEps = eps;
    } else {
      bestIdx = idx;
      bestEps = eps;
      found = true;
      minEps = eps;
    }
  }

  if (!found) {
    const idx = rdpIndices(points, (minEps + maxEps) / 2);
    const deduped = dedupeClosedIndices(points, idx);
    return {
      vertices: deduped.map((i) => points[i]!),
      indices: deduped,
      epsilon: (minEps + maxEps) / 2,
      found: false,
    };
  }

  const deduped = dedupeClosedIndices(points, bestIdx);
  return {
    vertices: deduped.map((i) => points[i]!),
    indices: deduped,
    epsilon: bestEps,
    found: true,
  };
}

function uniqueCornerCount(points: ArrayLike<Vec2>, idx: number[]): number {
  return dedupeClosedIndices(points, idx).length;
}

function dedupeClosedIndices(points: ArrayLike<Vec2>, idx: number[]): number[] {
  if (idx.length < 2) return idx.slice();
  const first = points[idx[0]!]!;
  const last = points[idx[idx.length - 1]!]!;
  if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) {
    return idx.slice(0, -1);
  }
  return idx.slice();
}
