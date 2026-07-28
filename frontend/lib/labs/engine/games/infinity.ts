import { INFINITY_CONFIG } from "../../config/games";
import { bestCyclicShift, generateLemniscate } from "../../algorithms/lemniscate";
import { ordinaryProcrustes, scaleToUnitRms } from "../../algorithms/procrustes";
import {
  intersectionOriginError,
  lobeSymmetryError,
} from "../../metrics/infinity";
import { kinematicConfidenceError, tafDerivativeVariance } from "../../metrics/taf";
import { emptyFlags } from "../../metrics/security";
import { buildMetricBreakdown, scoreFromTotalError } from "../../scoring/exponential";
import type { AntiCheatFlags, LabScoreResult, NormalizedStroke } from "../../types";

/**
 * Infinity Loop — labs.md §2.3 / §4.4 / §10.
 * Arc-length-matched Lemniscate + cyclic phase search + OPA (SVD).
 */
export function scoreInfinityLoop(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  const n = stroke.points.length;
  const reference = generateLemniscate(n);
  const user = scaleToUnitRms(stroke.points.map((p) => ({ x: p.x, y: p.y })));

  const candidates = [
    ordinaryProcrustes(bestCyclicShift(user, reference), reference),
    ordinaryProcrustes(bestCyclicShift([...user].reverse(), reference), reference),
  ];
  const best = candidates.reduce((a, b) =>
    a.rmsDistance <= b.rmsDistance ? a : b,
  );

  const aligned = best.rotated;
  const procrustes = best.rmsDistance;
  const symmetry = lobeSymmetryError(aligned);
  const intersection = intersectionOriginError(aligned);
  const smoothness = tafDerivativeVariance(aligned);
  const confidence = kinematicConfidenceError(
    aligned.map((p, i) => ({
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
