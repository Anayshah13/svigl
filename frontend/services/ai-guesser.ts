/**
 * Client for the experimental AI Guesser backend.
 *
 * The browser never sees a model API key — it only calls our FastAPI routes.
 */

import { ApiError, apiFetch, getApiUrl, withAuthHeaders } from "@/lib/api";
import { sendLimitAlert } from "@/services/feedback";
import type {
  AnalyzeInput,
  AnalyzeResult,
  CandidateMode,
  GuessItem,
} from "@/features/ai-guesser/types";

interface AiGuessApiItem {
  answer: string;
  confidence: number;
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
      }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      void sendLimitAlert("AI guesser 429 from the live page.");
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
  };
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
  } catch {
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
