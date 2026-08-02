import { CENTER_OFFSET_MAX, CENTER_WINDING_MIN } from "../../config/global";
import { CIRCLE_CONFIG } from "../../config/games";
import {
  circleMaxDeviation,
  circleRmse,
  hausdorffDistance,
  sampleCircle,
} from "../../metrics/circle";
import { kinematicConfidenceError, tafDerivativeVariance } from "../../metrics/taf";
import { buildMetricBreakdown, scoreFromTotalError } from "../../scoring/exponential";
import type { AntiCheatFlags, LabScoreResult, NormalizedStroke, Vec2 } from "../../types";
import { emptyFlags } from "../../metrics/security";
import { centroidOf, windingAroundOrigin } from "../../utils/math";

const ORIGIN: Vec2 = { x: 0, y: 0 };

/**
 * Perfect Circle — scored against the fixed canvas center (celestial axis).
 * Radius = mean distance from that origin. Must encircle the center mark.
 */
export function scorePerfectCircle(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  const winding = Math.abs(windingAroundOrigin(stroke.points));
  if (winding < CENTER_WINDING_MIN) {
    return reject(
      flags,
      "Draw around the center mark — the circle must enclose it.",
    );
  }

  const mass = centroidOf(stroke.points);
  const offset = Math.hypot(mass.x, mass.y);
  if (offset > CENTER_OFFSET_MAX) {
    return reject(
      flags,
      "Keep the circle centered on the mark — off-center drawings score zero.",
    );
  }

  const radius = meanRadiusFromOrigin(stroke.points);
  if (!(radius > 1e-6)) {
    return reject(flags, "Could not measure a radius around the center.");
  }

  const roundness = circleRmse(stroke.points, ORIGIN, radius);
  const radialMax = circleMaxDeviation(stroke.points, ORIGIN, radius);
  const ideal = sampleCircle(ORIGIN, radius, 256);
  const hausdorff = hausdorffDistance(stroke.points, ideal);
  const maxDeviation = Math.max(radialMax, hausdorff);

  const smoothness = tafDerivativeVariance(stroke.points);
  const confidence = kinematicConfidenceError(stroke.points);
  const closure = stroke.closureRatio;

  if (smoothness < 1e-12) {
    flags = { ...flags, is_hardware_assisted: true };
  }

  const { metrics, totalError } = buildMetricBreakdown(
    {
      roundness,
      smoothness,
      max_deviation: maxDeviation,
      closure,
      confidence,
    },
    CIRCLE_CONFIG.metrics,
    CIRCLE_CONFIG.decayK,
  );

  return {
    status: "VALID",
    final_score: scoreFromTotalError(totalError, CIRCLE_CONFIG.decayK),
    total_error: totalError,
    metrics,
    flags,
  };
}

function meanRadiusFromOrigin(points: ArrayLike<Vec2>): number {
  const n = points.length;
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    s += Math.hypot(p.x, p.y);
  }
  return s / n;
}

function reject(flags: AntiCheatFlags, message: string): LabScoreResult {
  return {
    status: "REJECTED_SHAPE",
    final_score: 0,
    total_error: Infinity,
    metrics: [],
    flags,
    message,
  };
}
