export type {
  AntiCheatFlags,
  LabGameId,
  LabScoreResult,
  MetricBreakdownItem,
  NormalizedStroke,
  TimedPoint,
  Vec2,
  ScoreStatus,
} from "./types";

export { TARGET_POINTS, CLOSURE_THRESHOLD, SCORE_FLOOR } from "./config/global";
export { GAME_CONFIGS } from "./config/games";

export { preprocessStroke } from "./normalization";
export { resampleByArcLength } from "./normalization/resample";
export { normalizeCentroidRms } from "./normalization/normalize";
export { applyTopologyFixes } from "./normalization/topology";

export { fitCircleTaubin } from "./algorithms/taubin";
export { dynamicRdpCorners, ramerDouglasPeucker } from "./algorithms/rdp";
export { ordinaryProcrustes } from "./algorithms/procrustes";
export { generateLemniscate } from "./algorithms/lemniscate";

export { evaluateLabStroke } from "./engine/evaluate";
export {
  buildMetricBreakdown,
  errorToPercent,
  finalizeScore,
  scoreFromTotalError,
} from "./scoring/exponential";
