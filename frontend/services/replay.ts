/**
 * HTTP client for drawing / game replay timelines.
 */

import { apiFetch } from "@/lib/api";
import type {
  DrawingReplay,
  GameReplay,
  ReplayEvent,
} from "@/features/replay/types";

interface DrawingReplayApi {
  version: 1;
  meta: {
    drawing_id: string;
    session_id: string;
    turn_number: number;
    word: string;
    author_id: string;
    author_name: string | null;
    duration_ms: number;
    event_count: number;
    published_at: string | null;
  };
  events: ReplayEvent[];
}

interface GameReplayApi {
  version: 1;
  game_id: string;
  room_id: string | null;
  drawings: DrawingReplayApi[];
}

function mapDrawing(raw: DrawingReplayApi): DrawingReplay {
  return {
    version: 1,
    meta: {
      drawing_id: raw.meta.drawing_id,
      session_id: raw.meta.session_id,
      turn_number: raw.meta.turn_number,
      word: raw.meta.word,
      author_id: raw.meta.author_id,
      author_name: raw.meta.author_name,
      duration_ms: raw.meta.duration_ms,
      event_count: raw.meta.event_count,
      published_at: raw.meta.published_at,
    },
    events: Array.isArray(raw.events) ? raw.events : [],
  };
}

export async function fetchGameReplay(gameId: string): Promise<GameReplay> {
  const data = await apiFetch<GameReplayApi>(`/games/${gameId}/replay`);
  return {
    version: 1,
    game_id: data.game_id,
    room_id: data.room_id,
    drawings: (data.drawings ?? []).map(mapDrawing),
  };
}

export async function fetchDrawingReplay(
  drawingId: string,
): Promise<DrawingReplay> {
  const data = await apiFetch<DrawingReplayApi>(
    `/drawings/${drawingId}/replay`,
  );
  return mapDrawing(data);
}
