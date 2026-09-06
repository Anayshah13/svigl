/**
 * Tunables for the experimental AI Guesser mode.
 *
 * Cadence and commitment match the in-game AnAI bot (`bot_coordinator`):
 * debounce, dirty-canvas only, one shouted guess per call, confidence floor.
 */

export interface AiGuesserConfig {
  /** Quiet period after first ink before the first look. */
  DEBOUNCE_MS: number;
  /** How often the scheduler re-evaluates. Cheap: no network, no rasterizing. */
  TICK_INTERVAL_MS: number;
  /** Hard cap on model calls for one drawing (one "turn"). */
  MAX_CALLS_PER_TURN: number;
  /** Below this, the bot stays silent even if the model named something. */
  MIN_CONFIDENCE: number;

  /** New shapes needed to score 1.0 on the shape-count signal. */
  NEW_SHAPE_SATURATION: number;
  /** New stroke length (board units) needed to score 1.0. */
  NEW_LENGTH_SATURATION: number;
  /** Relative bounding-box growth needed to score 1.0. */
  BBOX_GROWTH_SATURATION: number;
  /** Score assigned when ink was edited/erased rather than added. */
  STRUCTURAL_CHANGE_SCORE: number;

  /** Square snapshot edge in px sent to the model. Keep small — sketches. */
  SNAPSHOT_SIZE: number;
  /** Client-side abort deadline for one AI call. */
  REQUEST_TIMEOUT_MS: number;
  /** Base cool-off after a failure; grows linearly per consecutive failure. */
  ERROR_BACKOFF_MS: number;
  MAX_ERROR_BACKOFF_MS: number;
  /** How long the "Guessed" flash lasts before returning to watching. */
  STATUS_UPDATED_MS: number;
  /** Consecutive failures before the UI switches to "unavailable". */
  UNAVAILABLE_AFTER_ERRORS: number;
}

export const AI_GUESSER_CONFIG: AiGuesserConfig = {
  // Same numbers as backend bot_guess_* settings.
  DEBOUNCE_MS: 4000,
  TICK_INTERVAL_MS: 400,
  MAX_CALLS_PER_TURN: 8,
  MIN_CONFIDENCE: 0.22,

  NEW_SHAPE_SATURATION: 3,
  NEW_LENGTH_SATURATION: 900,
  BBOX_GROWTH_SATURATION: 0.45,
  STRUCTURAL_CHANGE_SCORE: 0.3,

  SNAPSHOT_SIZE: 256,
  REQUEST_TIMEOUT_MS: 18000,
  ERROR_BACKOFF_MS: 4000,
  MAX_ERROR_BACKOFF_MS: 16000,
  STATUS_UPDATED_MS: 1400,
  UNAVAILABLE_AFTER_ERRORS: 2,
};

export function resolveConfig(
  overrides?: Partial<AiGuesserConfig>,
): AiGuesserConfig {
  return overrides ? { ...AI_GUESSER_CONFIG, ...overrides } : AI_GUESSER_CONFIG;
}

export {
  AI_GUESSER_CANDIDATES,
  AI_GUESSER_WORDS,
  emojiFor,
} from "./words";
