import {
  ISOPERIMETRIC_REJECT,
  MIN_BBOX_SPAN,
  MIN_RAW_POINTS,
  MULTI_LOOP_TURNING,
  TRACING_TIME_MS,
  VELOCITY_VARIANCE_BOT,
} from "../config/global";
import type { AntiCheatFlags, LabGameId, LabScoreResult, TimedPoint } from "../types";
import { shoelaceArea, variance } from "../utils/math";
import { turningAngles, velocitySamples } from "./taf";

export function emptyFlags(): AntiCheatFlags {
  return {
    is_hardware_assisted: false,
    is_synthetic_velocity: false,
    is_multi_loop: false,
    is_scribble: false,
    is_slow_trace: false,
  };
}

/**
 * Early gates that only need the raw stroke (size / timing / bots).
 * Multi-loop & isoperimetric run later on the resampled curve so pixel
 * jitter does not inflate Σ|Δθ| into a false multi-loop rejection.
 */
export function runEarlySecurityChecks(
  raw: TimedPoint[],
): { ok: true; flags: AntiCheatFlags } | { ok: false; result: LabScoreResult } {
  const flags = emptyFlags();

  if (raw.length < MIN_RAW_POINTS) {
    return {
      ok: false,
      result: reject("REJECTED_TOO_SHORT", flags, "Stroke is too short to evaluate."),
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY);
  if (span < MIN_BBOX_SPAN) {
    return {
      ok: false,
      result: reject("REJECTED_TOO_SHORT", flags, "Drawing is too small."),
    };
  }

  const velocities = velocitySamples(raw);
  const velVar = variance(velocities);
  // Spec: variance < 0.001 ⇒ synthetic. Also require near-constant step
  // lengths so lightly jittered human timing is not false-positive.
  if (velocities.length >= 8 && velVar < VELOCITY_VARIANCE_BOT) {
    const steps: number[] = [];
    for (let i = 1; i < raw.length; i++) {
      steps.push(
        Math.hypot(raw[i]!.x - raw[i - 1]!.x, raw[i]!.y - raw[i - 1]!.y),
      );
    }
    const stepCv = Math.sqrt(variance(steps)) / (Math.max(...steps) || 1);
    if (stepCv < 0.02) {
      flags.is_synthetic_velocity = true;
      return {
        ok: false,
        result: reject("REJECTED_BOT", flags, "Stroke velocity looks synthetic."),
      };
    }
  }

  const duration = raw[raw.length - 1]!.t - raw[0]!.t;
  if (duration > TRACING_TIME_MS) {
    flags.is_slow_trace = true;
    return {
      ok: false,
      result: reject(
        "REJECTED_TRACING",
        flags,
        "Stroke took too long — possible tracing assistance.",
      ),
    };
  }

  return { ok: true, flags };
}

/** Topology / scribble checks on the arc-length-resampled stroke. */
export function runResampledSecurityChecks(
  resampled: TimedPoint[],
  game: LabGameId,
  flags: AntiCheatFlags,
): { ok: true; flags: AntiCheatFlags } | { ok: false; result: LabScoreResult } {
  // Net winding of the unwrapped tangent (≈ 2π per simple closed loop).
  // Spec writes Σ|Δθ|, but absolute micro-tremor sums false-trigger on
  // human noise; net winding is the robust multi-loop detector.
  const theta = turningAngles(resampled);
  if (theta.length >= 2 && game !== "infinity-loop") {
    const net = Math.abs(theta[theta.length - 1]! - theta[0]!);
    if (net > MULTI_LOOP_TURNING) {
      const next = { ...flags, is_multi_loop: true };
      return {
        ok: false,
        result: reject(
          "REJECTED_MULTI_LOOP",
          next,
          "Multiple loops detected — draw a single continuous shape.",
        ),
      };
    }
  }

  if (game !== "infinity-loop") {
    const area = Math.abs(shoelaceArea(resampled));
    let peri = 0;
    for (let i = 1; i < resampled.length; i++) {
      peri += Math.hypot(
        resampled[i]!.x - resampled[i - 1]!.x,
        resampled[i]!.y - resampled[i - 1]!.y,
      );
    }
    peri += Math.hypot(
      resampled[0]!.x - resampled[resampled.length - 1]!.x,
      resampled[0]!.y - resampled[resampled.length - 1]!.y,
    );
    if (peri > 1e-9) {
      const Q = (4 * Math.PI * area) / (peri * peri);
      if (Q < ISOPERIMETRIC_REJECT) {
        const next = { ...flags, is_scribble: true };
        return {
          ok: false,
          result: reject("REJECTED_SCRIBBLE", next, "Stroke looks like a scribble."),
        };
      }
    }
  }

  return { ok: true, flags };
}

function reject(
  status: LabScoreResult["status"],
  flags: AntiCheatFlags,
  message: string,
): LabScoreResult {
  return {
    status,
    final_score: 0,
    total_error: Infinity,
    metrics: [],
    flags,
    message,
  };
}
