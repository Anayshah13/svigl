/**
 * Client for the experimental AI Guesser backend.
 *
 * The browser never sees a model API key — it only calls our FastAPI routes.
 */

import { ApiError, apiFetch, getApiUrl, isAbortError, withAuthHeaders } from "@/lib/api";
import { sendLimitAlert } from "@/services/feedback";
import type {
  AiGuessMatchState,
  AiGuessSplit,
  AnalyzeInput,
  AnalyzeResult,
  CandidateMode,
  GuessItem,
} from "@/features/ai-guesser/types";

interface AiGuessApiItem {
  answer: string;
  confidence: number;
}

interface AiGuessSplitApi {
  ms: number;
  solved: boolean;
}

interface AiGuessMatchApi {
  run_id: string;
  week_id: string;
  game_index: number;
  game_slug: string;
  prompt_index: number;
  secret: string;
  deadline_at: string | null;
  calls_used: number;
  calls_left: number;
  splits: AiGuessSplitApi[];
  status: string;
  prompt_solved: boolean;
  prompt_failed: boolean;
  last_split: AiGuessSplitApi | null;
  total_ms: number | null;
  is_personal_best: boolean | null;
  rank: number | null;
}

interface AiGuessApiResponse {
  guesses: AiGuessApiItem[];
  line?: string | null;
  model: string;
  mode: CandidateMode;
  drawing_version: number;
  latency_ms: number;
  usage: {
    prompt_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
  } | null;
  match?: AiGuessMatchApi | null;
}

export interface AiGuesserConfigInfo {
  enabled: boolean;
  model: string;
  minCallIntervalMs: number;
  ttsEnabled: boolean;
}

interface AiGuesserConfigApiResponse {
  enabled: boolean;
  model: string;
  min_call_interval_ms: number;
  tts_enabled?: boolean;
}

export async function fetchAiGuesserConfig(
  signal?: AbortSignal,
): Promise<AiGuesserConfigInfo> {
  const data = await apiFetch<AiGuesserConfigApiResponse>(
    "/ai-guesser/config",
    { signal },
  );
  return {
    enabled: Boolean(data.enabled),
    model: data.model,
    minCallIntervalMs: data.min_call_interval_ms,
    ttsEnabled: Boolean(data.tts_enabled),
  };
}

function normalizeGuesses(items: AiGuessApiItem[]): GuessItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (item) =>
        typeof item?.answer === "string" &&
        typeof item?.confidence === "number" &&
        Number.isFinite(item.confidence),
    )
    .map((item) => ({
      answer: item.answer,
      confidence: Math.min(1, Math.max(0, item.confidence)),
    }));
}

export async function requestAiGuess(
  input: AnalyzeInput,
  signal: AbortSignal,
): Promise<AnalyzeResult> {
  let data: AiGuessApiResponse;
  try {
    data = await apiFetch<AiGuessApiResponse>("/ai-guesser/guess", {
      method: "POST",
      signal,
      body: JSON.stringify({
        image_base64: input.imageBase64,
        mime_type: input.mimeType,
        drawing_version: input.drawingVersion,
        mode: input.mode,
        previous_guesses: input.previousGuesses,
        run_id: input.runId ?? undefined,
        prompt_index: input.promptIndex ?? undefined,
      }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      void sendLimitAlert("AI guesser 429 from the live page.");
    }
    // Stale run after advance/finish — treat as a silent abort so the panel
    // does not flash "Network request failed" / unavailable.
    if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
      const abort = new DOMException("Stale AI Guesser run.", "AbortError");
      throw abort;
    }
    throw error;
  }

  return {
    guesses: normalizeGuesses(data.guesses),
    line: typeof data.line === "string" ? data.line.trim() : "",
    model: data.model,
    mode: data.mode,
    drawingVersion: data.drawing_version,
    latencyMs: data.latency_ms,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : null,
    match: data.match ? mapMatch(data.match) : null,
  };
}

export interface WeeklyGameCard {
  index: number;
  slug: string;
  title: string;
  description: string;
  myBestMs: number | null;
  myRank: number | null;
  finished: boolean;
}

export interface WeekOverview {
  weekId: string;
  resetsAt: string;
  games: WeeklyGameCard[];
  freePlayUnlocked: boolean;
  finishedCount: number;
  promptLimitMs: number;
  maxCalls: number;
  promptsPerGame: number;
}

export interface AiGuesserLeaderboardEntry {
  rank: number;
  userId: string;
  player: string;
  totalMs: number;
  splits: AiGuessSplit[];
  updatedAt: string;
}

export interface AiGuesserLeaderboardPage {
  weekId: string;
  gameSlug: string;
  gameTitle: string;
  entries: AiGuesserLeaderboardEntry[];
  total: number;
  myBestMs: number | null;
  myRank: number | null;
  mySplits: AiGuessSplit[] | null;
}

function mapSplit(item: AiGuessSplitApi): AiGuessSplit {
  return { ms: item.ms, solved: item.solved };
}

function mapMatch(data: AiGuessMatchApi): AiGuessMatchState {
  return {
    runId: data.run_id,
    weekId: data.week_id,
    gameIndex: data.game_index,
    gameSlug: data.game_slug,
    promptIndex: data.prompt_index,
    secret: data.secret,
    deadlineAt: data.deadline_at,
    callsUsed: data.calls_used,
    callsLeft: data.calls_left,
    splits: (data.splits ?? []).map(mapSplit),
    status: data.status,
    promptSolved: data.prompt_solved,
    promptFailed: data.prompt_failed,
    lastSplit: data.last_split ? mapSplit(data.last_split) : null,
    totalMs: data.total_ms,
    isPersonalBest: data.is_personal_best,
    rank: data.rank,
  };
}

export async function fetchAiGuesserWeek(
  signal?: AbortSignal,
): Promise<WeekOverview> {
  const data = await apiFetch<{
    week_id: string;
    resets_at: string;
    games: Array<{
      index: number;
      slug: string;
      title: string;
      description: string;
      my_best_ms: number | null;
      my_rank: number | null;
      finished: boolean;
    }>;
    free_play_unlocked: boolean;
    finished_count: number;
    prompt_limit_ms: number;
    max_calls: number;
    prompts_per_game: number;
  }>("/ai-guesser/week", { signal });
  return {
    weekId: data.week_id,
    resetsAt: data.resets_at,
    games: data.games.map((game) => ({
      index: game.index,
      slug: game.slug,
      title: game.title,
      description: game.description,
      myBestMs: game.my_best_ms,
      myRank: game.my_rank,
      finished: game.finished,
    })),
    freePlayUnlocked: data.free_play_unlocked,
    finishedCount: data.finished_count,
    promptLimitMs: data.prompt_limit_ms,
    maxCalls: data.max_calls,
    promptsPerGame: data.prompts_per_game,
  };
}

export async function startAiGuesserRun(
  game: string,
  signal?: AbortSignal,
): Promise<AiGuessMatchState> {
  const data = await apiFetch<AiGuessMatchApi>("/ai-guesser/runs", {
    method: "POST",
    signal,
    body: JSON.stringify({ game }),
  });
  return mapMatch(data);
}

export async function fetchActiveAiGuesserRun(
  game?: string,
  signal?: AbortSignal,
): Promise<AiGuessMatchState | null> {
  const query = game ? `?game=${encodeURIComponent(game)}` : "";
  const data = await apiFetch<AiGuessMatchApi | null>(
    `/ai-guesser/runs/active${query}`,
    { signal },
  );
  return data ? mapMatch(data) : null;
}

export async function failAiGuesserPrompt(
  runId: string,
  signal?: AbortSignal,
): Promise<AiGuessMatchState> {
  const data = await apiFetch<AiGuessMatchApi>(
    `/ai-guesser/runs/${runId}/fail`,
    { method: "POST", signal },
  );
  return mapMatch(data);
}

export async function fetchAiGuesserLeaderboard(
  game: string,
  signal?: AbortSignal,
): Promise<AiGuesserLeaderboardPage> {
  const data = await apiFetch<{
    week_id: string;
    game_slug: string;
    game_title: string;
    entries: Array<{
      rank: number;
      user_id: string;
      player: string;
      total_ms: number;
      splits: AiGuessSplitApi[];
      updated_at: string;
    }>;
    total: number;
    my_best_ms: number | null;
    my_rank: number | null;
    my_splits: AiGuessSplitApi[] | null;
  }>(`/ai-guesser/games/${game}/leaderboard`, { signal });
  return {
    weekId: data.week_id,
    gameSlug: data.game_slug,
    gameTitle: data.game_title,
    entries: data.entries.map((entry) => ({
      rank: entry.rank,
      userId: entry.user_id,
      player: entry.player,
      totalMs: entry.total_ms,
      splits: (entry.splits ?? []).map(mapSplit),
      updatedAt: entry.updated_at,
    })),
    total: data.total,
    myBestMs: data.my_best_ms,
    myRank: data.my_rank,
    mySplits: data.my_splits ? data.my_splits.map(mapSplit) : null,
  };
}

export async function fetchFreePlayWord(
  exclude?: string,
  signal?: AbortSignal,
): Promise<string> {
  const query = exclude ? `?exclude=${encodeURIComponent(exclude)}` : "";
  const data = await apiFetch<{ secret: string }>(
    `/ai-guesser/free-play/word${query}`,
    { signal },
  );
  return data.secret;
}

/** Stream PCM (or a cached WAV). The Gemini key never leaves FastAPI. */
export async function requestAiSpeech(
  text: string,
  signal?: AbortSignal,
): Promise<Response> {
  const headers = withAuthHeaders({ "Content-Type": "application/json" });
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/ai-guesser/speak`, {
      method: "POST",
      credentials: "include",
      headers,
      signal,
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      throw error instanceof Error
        ? error
        : new DOMException("The operation was aborted.", "AbortError");
    }
    throw new ApiError(0, null, "Network request failed");
  }

  if (response.ok) return response;

  if (response.status === 429) {
    void sendLimitAlert("AI guesser TTS 429 from the live page.");
  }

  const payload = (await response.json().catch(() => null)) as {
    detail?: string;
  } | null;
  const detail = typeof payload?.detail === "string" ? payload.detail : null;
  throw new ApiError(response.status, detail);
}
