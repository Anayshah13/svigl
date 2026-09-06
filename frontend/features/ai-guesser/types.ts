/** Shared types for the experimental AI Guesser mode. */

export type CandidateMode = "game" | "open";

export type AiGuesserStatus =
  /** No ink on the board yet. */
  | "idle"
  /** Ink present, watching for a change worth analyzing. */
  | "watching"
  /** A request is in flight. */
  | "thinking"
  /** A fresh, non-stale result just landed. */
  | "updated"
  /** Last attempt failed; drawing continues unaffected. */
  | "unavailable";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Cheap deterministic description of the board, used for change detection. */
export interface DrawingSignature {
  shapeCount: number;
  /** Approximate on-curve point count across all geometry. */
  pointCount: number;
  /** Approximate total stroke length in board units. */
  totalLength: number;
  bbox: Bounds | null;
  /** Position-sensitive rollup so moves/erases register as changes. */
  digest: number;
  /** One-string equality check for "did anything at all change". */
  fingerprint: string;
}

export interface GuessItem {
  answer: string;
  confidence: number;
}

export interface AiGuessUsage {
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AnalyzeInput {
  imageBase64: string;
  mimeType: string;
  drawingVersion: number;
  mode: CandidateMode;
  previousGuesses: string[];
}

export interface AnalyzeResult {
  guesses: GuessItem[];
  /** Short spoken aside from the model. Empty when omitted. */
  line: string;
  model: string;
  mode: CandidateMode;
  drawingVersion: number;
  latencyMs: number;
  usage: AiGuessUsage | null;
}

export interface DrawingSnapshot {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface AiGuesserState {
  status: AiGuesserStatus;
  /** Smoothed, ranked guesses for display. */
  guesses: GuessItem[];
  /** Latest spoken aside. Cleared on reset; left alone when a response is stale. */
  line: string | null;
  /** True when the leader is weak or the top two are close. */
  uncertain: boolean;
  drawingVersion: number;
  analyzedVersion: number | null;
  lastAnalyzedAt: number | null;
  latencyMs: number | null;
  callsThisDrawing: number;
  callsThisSession: number;
  /** Responses discarded because the drawing had moved on. */
  staleDropped: number;
  errorMessage: string | null;
  usage: AiGuessUsage | null;
  model: string | null;
  lastChangeScore: number;
}

export function createInitialState(): AiGuesserState {
  return {
    status: "idle",
    guesses: [],
    line: null,
    uncertain: false,
    drawingVersion: 0,
    analyzedVersion: null,
    lastAnalyzedAt: null,
    latencyMs: null,
    callsThisDrawing: 0,
    callsThisSession: 0,
    staleDropped: 0,
    errorMessage: null,
    usage: null,
    model: null,
    lastChangeScore: 0,
  };
}

export const STATUS_LABEL: Record<AiGuesserStatus, string> = {
  idle: "Waiting for drawing...",
  watching: "Watching...",
  thinking: "Thinking...",
  updated: "Guess updated",
  unavailable: "AI unavailable",
};
