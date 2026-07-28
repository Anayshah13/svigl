/**
 * Pure reducer: apply one replay event to a shape list.
 *
 * Reuses whiteboard HistoryOp applyForward / applyInverse so live multiplayer
 * and replay stay semantically identical.
 */

import { applyForward, applyInverse } from "@/features/whiteboard/history";
import { normalizeShape } from "@/features/whiteboard/serialize";
import type { HistoryOp, WhiteboardShape } from "@/features/whiteboard/types";
import type { ReplayEvent } from "./types";

function upsertShape(
  shapes: WhiteboardShape[],
  shape: WhiteboardShape,
): WhiteboardShape[] {
  const idx = shapes.findIndex((s) => s.id === shape.id);
  if (idx < 0) return [...shapes, shape];
  const next = shapes.slice();
  next[idx] = shape;
  return next;
}

function parseHistoryOp(raw: unknown): HistoryOp | null {
  if (!raw || typeof raw !== "object") return null;
  const op = raw as HistoryOp;
  if (
    op.type !== "add" &&
    op.type !== "remove" &&
    op.type !== "update" &&
    op.type !== "clear" &&
    op.type !== "replace"
  ) {
    return null;
  }
  return op;
}

/**
 * Apply a single timeline event. Returns a new array (immutable) so callers
 * can keep previous frames if needed; the replay engine may discard them.
 */
export function applyReplayEvent(
  shapes: WhiteboardShape[],
  event: ReplayEvent,
): WhiteboardShape[] {
  switch (event.type) {
    case "shape.created":
    case "shape.updated": {
      const shape = normalizeShape(event.payload.shape);
      if (!shape) return shapes;
      return upsertShape(shapes, shape);
    }
    case "shape.deleted": {
      const id =
        typeof event.payload.shape_id === "string"
          ? event.payload.shape_id
          : typeof event.payload.shapeId === "string"
            ? event.payload.shapeId
            : null;
      if (!id) return shapes;
      return shapes.filter((s) => s.id !== id);
    }
    case "canvas.cleared":
      return [];
    case "undo": {
      const op = parseHistoryOp(event.payload.op);
      if (!op) return shapes;
      return applyInverse(shapes, op);
    }
    case "redo": {
      const op = parseHistoryOp(event.payload.op);
      if (!op) return shapes;
      return applyForward(shapes, op);
    }
    default:
      return shapes;
  }
}

/** Apply events[0..endExclusive) from a blank board. */
export function reconstructShapes(
  events: readonly ReplayEvent[],
  endExclusive: number,
): WhiteboardShape[] {
  let shapes: WhiteboardShape[] = [];
  const end = Math.max(0, Math.min(endExclusive, events.length));
  for (let i = 0; i < end; i++) {
    shapes = applyReplayEvent(shapes, events[i]!);
  }
  return shapes;
}
