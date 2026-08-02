import { CENTER_OFFSET_MAX, CENTER_WINDING_MIN } from "../../config/global";
import { SQUARE_CONFIG, TRIANGLE_CONFIG, type GameScoreConfig } from "../../config/games";
import { dynamicRdpCorners } from "../../algorithms/rdp";
import {
  computeCenterPolygonMetrics,
  computePolygonMetrics,
} from "../../metrics/polygon";
import { kinematicConfidenceError, tafDerivativeVariance } from "../../metrics/taf";
import { emptyFlags } from "../../metrics/security";
import { buildMetricBreakdown, scoreFromTotalError } from "../../scoring/exponential";
import type { AntiCheatFlags, LabScoreResult, NormalizedStroke } from "../../types";
import { originInsidePolygon, windingAroundOrigin } from "../../utils/math";

export function scorePerfectSquare(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  return scorePolygon(stroke, SQUARE_CONFIG, "orthogonality", flags);
}

export function scorePerfectTriangle(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  return scorePolygon(stroke, TRIANGLE_CONFIG, "angles", flags);
}

function scorePolygon(
  stroke: NormalizedStroke,
  config: GameScoreConfig,
  angleMetricId: string,
  flags: AntiCheatFlags,
): LabScoreResult {
  const winding = Math.abs(windingAroundOrigin(stroke.points));
  const enclosesCenter =
    originInsidePolygon(stroke.points) || winding >= CENTER_WINDING_MIN;

  if (!enclosesCenter) {
    return reject(
      flags,
      "Draw around the center mark — the shape must enclose it.",
    );
  }

  const target = config.targetVertices ?? 4;
  const ideal = config.idealAngleRad ?? Math.PI / 2;
  const rdp = dynamicRdpCorners(stroke.points, target);

  if (!rdp.found || rdp.indices.length !== target) {
    return reject(
      flags,
      `Could not find exactly ${target} corners — not a clear polygon.`,
    );
  }

  const corners = rdp.indices.map((i) => stroke.points[i]!);
  const center = computeCenterPolygonMetrics(corners);
  if (center.centerOffset > CENTER_OFFSET_MAX) {
    return reject(
      flags,
      "Keep the shape centered on the mark — off-center drawings score zero.",
    );
  }

  const poly = computePolygonMetrics(stroke.points, rdp.indices, ideal);
  const confidence = kinematicConfidenceError(stroke.points);
  const tafVar = tafDerivativeVariance(stroke.points);
  if (tafVar < 1e-12) {
    flags = { ...flags, is_hardware_assisted: true };
  }

  // Side equality + center-axis regularity (equal radii / polar spacing).
  const sideEquality =
    poly.sideEquality +
    0.55 * center.radialError +
    0.45 * center.angularError +
    0.35 * center.centerOffset;

  const values: Record<string, number> = {
    [angleMetricId]: poly.angleError,
    straightness: poly.straightness,
    side_equality: sideEquality,
    closure: stroke.closureRatio,
    confidence,
  };

  const { metrics, totalError } = buildMetricBreakdown(
    values,
    config.metrics,
    config.decayK,
  );

  return {
    status: "VALID",
    final_score: scoreFromTotalError(totalError, config.decayK),
    total_error: totalError,
    metrics,
    flags,
  };
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
