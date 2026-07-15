/**
 * Thin collaborative canvas sync client.
 *
 * Publishes ops over the existing app WebSocket and applies remote snapshots /
 * ops into a local shape list. Designed to attach to the whiteboard UI later
 * without rewriting the room presence stack.
 */

import { throttle } from "@/features/whiteboard/throttle";
import {
  importShapes,
  isValidShape,
  mergeShapesById,
} from "@/features/whiteboard/serialize";
import type { HistoryOp, WhiteboardShape } from "@/features/whiteboard/types";
import { appWebSocket } from "@/services/app-websocket";
import type { WSEventType } from "@/types/room";

/** ~30fps for in-progress stroke updates. */
export const SHAPE_UPDATE_THROTTLE_MS = 33;

export type CanvasSyncEventType =
  | "SHAPE_CREATED"
  | "SHAPE_UPDATED"
  | "SHAPE_DELETED"
  | "CANVAS_CLEARED"
  | "CANVAS_CLEAR"
  | "UNDO"
  | "REDO"
  | "CANVAS_SNAPSHOT";

export interface CanvasSnapshot {
  sessionId: string | null;
  currentTurn: number;
  opSeq: number;
  shapes: WhiteboardShape[];
  canDraw: boolean;
}

export type CanvasSyncListener = (shapes: WhiteboardShape[], meta: CanvasSnapshot) => void;
export type CanvasSyncErrorListener = (code: string, message: string) => void;

function parseSnapshot(payload: Record<string, unknown>): CanvasSnapshot {
  let shapes: WhiteboardShape[] = [];
  try {
    shapes = importShapes(payload.shapes ?? []);
  } catch {
    shapes = [];
  }
  return {
    sessionId:
      typeof payload.session_id === "string"
        ? payload.session_id
        : payload.session_id != null
          ? String(payload.session_id)
          : null,
    currentTurn: typeof payload.current_turn === "number" ? payload.current_turn : 0,
    opSeq: typeof payload.op_seq === "number" ? payload.op_seq : 0,
    shapes,
    canDraw: Boolean(payload.can_draw),
  };
}

function applyRemoteOp(
  shapes: WhiteboardShape[],
  type: CanvasSyncEventType,
  payload: Record<string, unknown>,
): WhiteboardShape[] {
  switch (type) {
    case "CANVAS_SNAPSHOT":
      return parseSnapshot(payload).shapes;
    case "CANVAS_CLEARED":
    case "CANVAS_CLEAR":
      return [];
    case "SHAPE_CREATED":
    case "SHAPE_UPDATED": {
      const shape = payload.shape;
      if (!isValidShape(shape)) return shapes;
      return mergeShapesById(shapes, [shape]);
    }
    case "SHAPE_DELETED": {
      const id = payload.shape_id;
      if (typeof id !== "string") return shapes;
      return shapes.filter((s) => s.id !== id);
    }
    case "UNDO":
    case "REDO": {
      if (Array.isArray(payload.shapes)) {
        try {
          return importShapes(payload.shapes);
        } catch {
          return shapes;
        }
      }
      return shapes;
    }
    default:
      return shapes;
  }
}

const CANVAS_EVENT_SET = new Set<string>([
  "SHAPE_CREATED",
  "SHAPE_UPDATED",
  "SHAPE_DELETED",
  "CANVAS_CLEARED",
  "CANVAS_CLEAR",
  "UNDO",
  "REDO",
  "CANVAS_SNAPSHOT",
]);

/**
 * Syncs whiteboard shapes for one room attachment.
 *
 * ```ts
 * const stop = canvasSync.attach({ onShapes: setShapes });
 * canvasSync.publishShapeUpdated(shape); // throttled ~30fps
 * canvasSync.publishShapeCreated(shape); // on pointer up
 * ```
 */
export function createCanvasSyncClient() {
  let shapes: WhiteboardShape[] = [];
  let meta: CanvasSnapshot = {
    sessionId: null,
    currentTurn: 0,
    opSeq: 0,
    shapes: [],
    canDraw: false,
  };
  const listeners = new Set<CanvasSyncListener>();
  const errorListeners = new Set<CanvasSyncErrorListener>();
  let unsubscribeWs: (() => void) | null = null;

  const emit = () => {
    const snapshot: CanvasSnapshot = { ...meta, shapes: [...shapes] };
    for (const listener of listeners) listener(shapes, snapshot);
  };

  const applyIncoming = (type: CanvasSyncEventType, payload: Record<string, unknown>) => {
    if (type === "CANVAS_SNAPSHOT") {
      const snap = parseSnapshot(payload);
      shapes = snap.shapes;
      meta = snap;
      emit();
      return;
    }

    const nextSeq = typeof payload.op_seq === "number" ? payload.op_seq : null;
    if (nextSeq != null && nextSeq > 0 && nextSeq <= meta.opSeq) {
      return;
    }

    shapes = applyRemoteOp(shapes, type, payload);
    meta = {
      ...meta,
      sessionId:
        typeof payload.session_id === "string"
          ? payload.session_id
          : payload.session_id != null
            ? String(payload.session_id)
            : meta.sessionId,
      currentTurn:
        typeof payload.current_turn === "number"
          ? payload.current_turn
          : meta.currentTurn,
      opSeq: nextSeq != null ? nextSeq : meta.opSeq,
      shapes,
      canDraw: meta.canDraw,
    };
    emit();
  };

  const onWsCanvas = (type: WSEventType, payload: Record<string, unknown>) => {
    if (!CANVAS_EVENT_SET.has(type)) return;
    applyIncoming(type as CanvasSyncEventType, payload);
  };

  const send = (type: WSEventType, payload: Record<string, unknown>) => {
    const ok = appWebSocket.sendRaw(type, payload);
    if (!ok) {
      for (const listener of errorListeners) {
        listener("NETWORK_ERROR", "Reconnect to the room before drawing.");
      }
    }
  };

  const publishShapeUpdatedThrottled = throttle((shape: WhiteboardShape) => {
    send("SHAPE_UPDATED", { shape });
  }, SHAPE_UPDATE_THROTTLE_MS);

  return {
    getShapes(): WhiteboardShape[] {
      return shapes;
    },

    getSnapshot(): CanvasSnapshot {
      return { ...meta, shapes: [...shapes] };
    },

    subscribe(onShapes: CanvasSyncListener, onError?: CanvasSyncErrorListener): () => void {
      listeners.add(onShapes);
      if (onError) errorListeners.add(onError);
      return () => {
        listeners.delete(onShapes);
        if (onError) errorListeners.delete(onError);
      };
    },

    /** Wire into appWebSocket canvas fan-out. Idempotent. */
    attach(opts?: {
      onShapes?: CanvasSyncListener;
      onError?: CanvasSyncErrorListener;
    }): () => void {
      if (opts?.onShapes) listeners.add(opts.onShapes);
      if (opts?.onError) errorListeners.add(opts.onError);

      if (!unsubscribeWs) {
        unsubscribeWs = appWebSocket.subscribeCanvas(onWsCanvas);
      }

      return () => {
        if (opts?.onShapes) listeners.delete(opts.onShapes);
        if (opts?.onError) errorListeners.delete(opts.onError);
        if (listeners.size === 0 && errorListeners.size === 0 && unsubscribeWs) {
          unsubscribeWs();
          unsubscribeWs = null;
          publishShapeUpdatedThrottled.cancel();
        }
      };
    },

    applySnapshot(payload: Record<string, unknown> | CanvasSnapshot): void {
      if ("sessionId" in payload && Array.isArray((payload as CanvasSnapshot).shapes)) {
        const snap = payload as CanvasSnapshot;
        shapes = snap.shapes;
        meta = { ...snap };
        emit();
        return;
      }
      applyIncoming("CANVAS_SNAPSHOT", payload as Record<string, unknown>);
    },

    requestSnapshot(): void {
      send("CANVAS_SNAPSHOT_REQUEST", {});
    },

    publishShapeCreated(shape: WhiteboardShape): void {
      publishShapeUpdatedThrottled.flush();
      publishShapeUpdatedThrottled.cancel();
      shapes = mergeShapesById(shapes, [shape]);
      emit();
      send("SHAPE_CREATED", { shape });
    },

    /** Throttled ~30fps for in-progress strokes. */
    publishShapeUpdated(shape: WhiteboardShape): void {
      shapes = mergeShapesById(shapes, [shape]);
      emit();
      publishShapeUpdatedThrottled(shape);
    },

    flushShapeUpdated(): void {
      publishShapeUpdatedThrottled.flush();
    },

    publishShapeDeleted(shapeId: string): void {
      shapes = shapes.filter((s) => s.id !== shapeId);
      emit();
      send("SHAPE_DELETED", { shape_id: shapeId });
    },

    publishClear(): void {
      publishShapeUpdatedThrottled.cancel();
      shapes = [];
      emit();
      send("CANVAS_CLEARED", {});
    },

    publishUndo(): void {
      publishShapeUpdatedThrottled.cancel();
      send("UNDO", {});
    },

    publishRedo(): void {
      publishShapeUpdatedThrottled.cancel();
      send("REDO", {});
    },

    replaceShapes(next: WhiteboardShape[]): void {
      shapes = next;
      emit();
    },

    reset(): void {
      publishShapeUpdatedThrottled.cancel();
      shapes = [];
      meta = {
        sessionId: null,
        currentTurn: 0,
        opSeq: 0,
        shapes: [],
        canDraw: false,
      };
      emit();
    },
  };
}

export type CanvasSyncClient = ReturnType<typeof createCanvasSyncClient>;

/** Singleton for the active room tab — whiteboard UI can import this later. */
export const canvasSync = createCanvasSyncClient();

export type { HistoryOp, WhiteboardShape };
