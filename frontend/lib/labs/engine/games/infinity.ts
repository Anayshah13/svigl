import { INFINITY_INTERSECTION_MAX } from "../../config/global";
import { INFINITY_CONFIG } from "../../config/games";
import { bestCyclicShift, generateLemniscate } from "../../algorithms/lemniscate";
import {
  findSelfIntersection,
  intersectionOriginError,
  lobeSymmetryError,
} from "../../metrics/infinity";
import { kinematicConfidenceError, tafDerivativeVariance } from "../../metrics/taf";
import { emptyFlags } from "../../metrics/security";
import { buildMetricBreakdown, scoreFromTotalError } from "../../scoring/exponential";
import type { AntiCheatFlags, LabScoreResult, NormalizedStroke, Vec2 } from "../../types";

/**
 * Infinity Loop — axis-locked Lemniscate of Bernoulli.
 * Fixed canvas origin; x/y axes stay locked (no free rotation).
 * The self-crossing must collide near the origin on the mathematical form.
 */
export function scoreInfinityLoop(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  const n = stroke.points.length;
  const reference = generateLemniscate(n);
  // Already fixed-origin + unit-RMS from evaluate; keep a defensive rescale.
  const user = stroke.points.map((p) => ({ x: p.x, y: p.y }));

  // Axis-locked candidates: phase, reverse, and reflections about the axes.
  // Free Procrustes rotation is intentionally omitted so the formula stays
  // aligned with the visible x/y guides.
  const candidates = [
    bestCyclicShift(user, reference),
    bestCyclicShift([...user].reverse(), reference),
    bestCyclicShift(
      user.map((p) => ({ x: p.x, y: -p.y })),
      reference,
    ),
    bestCyclicShift(
      [...user].reverse().map((p) => ({ x: p.x, y: -p.y })),
      reference,
    ),
    bestCyclicShift(
      user.map((p) => ({ x: -p.x, y: p.y })),
      reference,
    ),
    bestCyclicShift(
      [...user].reverse().map((p) => ({ x: -p.x, y: p.y })),
      reference,
    ),
  ];

  let bestAligned: Vec2[] = candidates[0]!;
  let bestRms = Infinity;
  for (const candidate of candidates) {
    const rms = pointwiseRms(candidate, reference);
    if (rms < bestRms) {
      bestRms = rms;
      bestAligned = candidate;
    }
  }

  // Crossing must exist near the origin (lemniscate collides at (0,0)).
  const hit = findSelfIntersection(bestAligned) ?? findSelfIntersection(user);
  if (!hit || Math.hypot(hit.x, hit.y) > INFINITY_INTERSECTION_MAX) {
    return {
      status: "REJECTED_SHAPE",
      final_score: 0,
      total_error: Infinity,
      metrics: [],
      flags,
      message:
        "The infinity loop must cross itself at the origin on the axes.",
    };
  }

  // Require both lobes (left and right of the y-axis).
  if (lobeSymmetryError(bestAligned) >= 0.999) {
    return {
      status: "REJECTED_SHAPE",
      final_score: 0,
      total_error: Infinity,
      metrics: [],
      flags,
      message: "Draw both lobes of the infinity sign across the y-axis.",
    };
  }

  const procrustes = bestRms;
  const symmetry = lobeSymmetryError(bestAligned);
  const intersection = intersectionOriginError(bestAligned);
  const smoothness = tafDerivativeVariance(bestAligned);
  const confidence = kinematicConfidenceError(
    bestAligned.map((p, i) => ({
      x: p.x,
      y: p.y,
      t: stroke.points[i]?.t ?? i,
    })),
  );

  if (smoothness < 1e-12) {
    flags = { ...flags, is_hardware_assisted: true };
  }

  const { metrics, totalError } = buildMetricBreakdown(
    {
      procrustes,
      symmetry,
      intersection,
      smoothness,
      confidence,
    },
    INFINITY_CONFIG.metrics,
    INFINITY_CONFIG.decayK,
  );

  return {
    status: "VALID",
    final_score: scoreFromTotalError(totalError, INFINITY_CONFIG.decayK),
    total_error: totalError,
    metrics,
    flags,
  };
}

function pointwiseRms(a: Vec2[], b: Vec2[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const p = a[i]!;
    const q = b[i]!;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    sumSq += dx * dx + dy * dy;
  }
  return Math.sqrt(sumSq / n);
}
