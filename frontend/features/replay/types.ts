/**
 * Replay timeline types — mirror backend `schemas.replay`.
 *
 * Events are deterministic drawing ops (not canvas snapshots). Payloads reuse
 * WhiteboardShape / HistoryOp from the live whiteboard model.
 */

import type { DrawingTool, HistoryOp, WhiteboardShape } from "@/features/whiteboard/types";

export type ReplayEventType =
  | "shape.created"
  | "shape.updated"
  | "shape.deleted"
  | "canvas.cleared"
  | "undo"
  | "redo";

export type ReplayTool = DrawingTool | "eraser";

export type ReplayPlaybackSpeed = 0.5 | 1 | 2 | 4;

export const REPLAY_SPEEDS: ReplayPlaybackSpeed[] = [0.5, 1, 2, 4];

export interface ReplayEvent {
  /** Milliseconds since round start (recording only; playback remaps these). */
  t: number;
  type: ReplayEventType;
  player_id: string;
  tool: ReplayTool | null;
  payload: Record<string, unknown>;
}

export interface DrawingReplayMeta {
  drawing_id: string;
  session_id: string;
  turn_number: number;
  word: string;
  author_id: string;
  author_name: string | null;
  duration_ms: number;
  event_count: number;
  published_at: string | null;
}

export interface DrawingReplay {
  version: 1;
  meta: DrawingReplayMeta;
  events: ReplayEvent[];
}

export interface GameReplay {
  version: 1;
  game_id: string;
  room_id: string | null;
  drawings: DrawingReplay[];
}

/** Narrow payload helpers used by the apply reducer. */
export type ShapeCreatedPayload = { shape: WhiteboardShape };
export type ShapeDeletedPayload = { shape_id: string };
export type UndoRedoPayload = { op: HistoryOp };
