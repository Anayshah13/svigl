/**
 * Shared types for the Svigl Labs scoring engine.
 * Spec: labs.md — input domain P = {(x,y,t)}, output payload §10.
 */

export type TimedPoint = {
  x: number;
  y: number;
  /** Timestamp in milliseconds (performance.now or event.timeStamp). */
  t: number;
};

export type Vec2 = {
  x: number;
  y: number;
};

export type LabGameId =
  | "perfect-circle"
  | "perfect-square"
  | "perfect-triangle"
  | "infinity-loop";

export type ScoreStatus =
  | "VALID"
  | "REJECTED_BOT"
  | "REJECTED_SCRIBBLE"
  | "REJECTED_MULTI_LOOP"
  | "REJECTED_SHAPE"
  | "REJECTED_TOO_SHORT"
  | "REJECTED_TRACING";

export type MetricBreakdownItem = {
  /** Machine key, e.g. "roundness" */
  id: string;
  /** Human label for UI */
  label: string;
  /** Raw error contribution before weighting (normalized space). */
  error: number;
  /** Weight applied in E_total */
  weight: number;
  /** Weighted error = weight * error */
  weightedError: number;
  /** Per-metric percentage via exponential decay (0–100). */
  score: number;
};

export type AntiCheatFlags = {
  is_hardware_assisted: boolean;
  is_synthetic_velocity: boolean;
  is_multi_loop: boolean;
  is_scribble: boolean;
  is_slow_trace: boolean;
};

export type LabScoreResult = {
  status: ScoreStatus;
  /** Final percentage 0–100, two decimal places when VALID. */
  final_score: number;
  /** Weighted sum E_total before exponential mapping. */
  total_error: number;
  metrics: MetricBreakdownItem[];
  flags: AntiCheatFlags;
  /** Optional rejection reason for UI. */
  message?: string;
};

export type NormalizedStroke = {
  /** Arc-length resampled, RMS-normalized, topology-corrected points. */
  points: TimedPoint[];
  /** Arc length before resampling (raw stroke). */
  rawArcLength: number;
  /** Closure gap / rawArcLength (scale-invariant). */
  closureRatio: number;
  /** Absolute gap after RMS normalization. */
  closureGap: number;
  /** Fixed canvas origin used for normalization (celestial axis), in raw space. */
  centroid: Vec2;
  /** RMS scale applied. */
  rms: number;
};
