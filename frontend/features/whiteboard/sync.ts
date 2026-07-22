/**
 * Thin collaborative canvas sync client.
 *
 * Publishes ops over the existing app WebSocket and applies remote snapshots /
 * ops into a local shape list. Designed to attach to the whiteboard UI later
 * without rewriting the room presence stack.
 */

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
export const MAX_PREVIEW_BUFFERED_BYTES = 256 * 1024;

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
export type CanvasSyncEventListener = (
  type: CanvasSyncEventType,
  payload: Record<string, unknown>,
  shapes: WhiteboardShape[],
  meta: CanvasSnapshot,
) => void;

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
 * canvasSync.publishShapePreview(shape); // coalesced ~30fps, not persisted
 * canvasSync.publishShapeCreated(shape); // persisted on pointer up
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
  const eventListeners = new Set<CanvasSyncEventListener>();
  let unsubscribeWs: (() => void) | null = null;
  let expectedSessionId: string | null | undefined;
  const pendingPreviews = new Map<string, WhiteboardShape>();
  const previewTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const lastPreviewSentAt = new Map<string, number>();

  const emit = () => {
    const snapshot: CanvasSnapshot = { ...meta, shapes: [...shapes] };
    for (const listener of listeners) listener(shapes, snapshot);
  };

  const payloadSessionId = (payload: Record<string, unknown>): string | null =>
    payload.session_id == null ? null : String(payload.session_id);

  const isWrongEpoch = (payload: Record<string, unknown>): boolean => {
    const incomingSessionId = payloadSessionId(payload);
    if (
      expectedSessionId !== undefined &&
      incomingSessionId !== null &&
      incomingSessionId !== expectedSessionId
    ) {
      return true;
    }
    if (
      meta.sessionId !== null &&
      incomingSessionId !== null &&
      incomingSessionId !== meta.sessionId
    ) {
      return true;
    }
    const incomingTurn =
      typeof payload.current_turn === "number" ? payload.current_turn : null;
    return incomingTurn !== null && incomingTurn < meta.currentTurn;
  };

  const notifyEvent = (
    type: CanvasSyncEventType,
    payload: Record<string, unknown>,
  ) => {
    const snapshot = { ...meta, shapes: [...shapes] };
    for (const listener of eventListeners) {
      listener(type, payload, shapes, snapshot);
    }
  };

  const applyIncoming = (type: CanvasSyncEventType, payload: Record<string, unknown>) => {
    if (type === "CANVAS_SNAPSHOT") {
      const snap = parseSnapshot(payload);
      if (
        (expectedSessionId !== undefined &&
          snap.sessionId !== null &&
          snap.sessionId !== expectedSessionId) ||
        (meta.sessionId === snap.sessionId &&
          (snap.currentTurn < meta.currentTurn ||
            (snap.currentTurn === meta.currentTurn && snap.opSeq < meta.opSeq)))
      ) {
        return;
      }
      shapes = snap.shapes;
      meta = snap;
      emit();
      notifyEvent(type, payload);
      return;
    }

    if (isWrongEpoch(payload)) return;
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
    notifyEvent(type, payload);
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

  const clearPreviewTimer = (shapeId: string) => {
    const timer = previewTimers.get(shapeId);
    if (timer) clearTimeout(timer);
    previewTimers.delete(shapeId);
  };

  const drainPreview = (shapeId: string) => {
    clearPreviewTimer(shapeId);
    const shape = pendingPreviews.get(shapeId);
    if (!shape) return;
    if (appWebSocket.bufferedAmount > MAX_PREVIEW_BUFFERED_BYTES) {
      previewTimers.set(
        shapeId,
        setTimeout(() => drainPreview(shapeId), SHAPE_UPDATE_THROTTLE_MS),
      );
      return;
    }
    pendingPreviews.delete(shapeId);
    lastPreviewSentAt.set(shapeId, Date.now());
    send("SHAPE_UPDATED", { shape, ephemeral: true });
  };

  const schedulePreview = (shape: WhiteboardShape) => {
    pendingPreviews.set(shape.id, shape);
    if (previewTimers.has(shape.id)) return;
    const elapsed = Date.now() - (lastPreviewSentAt.get(shape.id) ?? 0);
    const delay = Math.max(0, SHAPE_UPDATE_THROTTLE_MS - elapsed);
    if (delay === 0) {
      drainPreview(shape.id);
      return;
    }
    previewTimers.set(shape.id, setTimeout(() => drainPreview(shape.id), delay));
  };

  const cancelPendingPreviews = (shapeId?: string) => {
    const ids = shapeId
      ? [shapeId]
      : [
          ...new Set([
            ...pendingPreviews.keys(),
            ...previewTimers.keys(),
            ...lastPreviewSentAt.keys(),
          ]),
        ];
    for (const id of ids) {
      clearPreviewTimer(id);
      pendingPreviews.delete(id);
      lastPreviewSentAt.delete(id);
    }
  };

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
      onEvent?: CanvasSyncEventListener;
    }): () => void {
      if (opts?.onShapes) listeners.add(opts.onShapes);
      if (opts?.onError) errorListeners.add(opts.onError);
      if (opts?.onEvent) eventListeners.add(opts.onEvent);

      if (!unsubscribeWs) {
        unsubscribeWs = appWebSocket.subscribeCanvas(onWsCanvas);
      }

      return () => {
        if (opts?.onShapes) listeners.delete(opts.onShapes);
        if (opts?.onError) errorListeners.delete(opts.onError);
        if (opts?.onEvent) eventListeners.delete(opts.onEvent);
        if (
          listeners.size === 0 &&
          errorListeners.size === 0 &&
          eventListeners.size === 0 &&
          unsubscribeWs
        ) {
          unsubscribeWs();
          unsubscribeWs = null;
          cancelPendingPreviews();
        }
      };
    },

    applySnapshot(payload: Record<string, unknown> | CanvasSnapshot): void {
      if ("sessionId" in payload && Array.isArray((payload as CanvasSnapshot).shapes)) {
        const snap = payload as CanvasSnapshot;
        applyIncoming("CANVAS_SNAPSHOT", {
          session_id: snap.sessionId,
          current_turn: snap.currentTurn,
          op_seq: snap.opSeq,
          shapes: snap.shapes,
          can_draw: snap.canDraw,
        });
        return;
      }
      applyIncoming("CANVAS_SNAPSHOT", payload as Record<string, unknown>);
    },

    setExpectedSessionId(sessionId: string | null): void {
      if (expectedSessionId === sessionId) return;
      expectedSessionId = sessionId;
      cancelPendingPreviews();
      if (meta.sessionId !== null && meta.sessionId !== sessionId) {
        shapes = [];
        meta = {
          sessionId,
          currentTurn: 0,
          opSeq: 0,
          shapes: [],
          canDraw: false,
        };
        emit();
      }
    },

    requestSnapshot(): void {
      send("CANVAS_SNAPSHOT_REQUEST", {});
    },

    publishShapeCreated(shape: WhiteboardShape): void {
      cancelPendingPreviews(shape.id);
      shapes = mergeShapesById(shapes, [shape]);
      emit();
      send("SHAPE_CREATED", { shape });
    },

    /** Coalesced ~30fps per shape; broadcasts without persistence. */
    publishShapePreview(shape: WhiteboardShape): void {
      shapes = mergeShapesById(shapes, [shape]);
      schedulePreview(shape);
    },

    cancelShapePreview(shapeId: string): void {
      cancelPendingPreviews(shapeId);
      shapes = shapes.filter((shape) => shape.id !== shapeId);
      send("SHAPE_DELETED", { shape_id: shapeId, ephemeral: true });
    },

    /** Persist a completed edit immediately. */
    publishShapeUpdated(shape: WhiteboardShape): void {
      cancelPendingPreviews(shape.id);
      shapes = mergeShapesById(shapes, [shape]);
      emit();
      send("SHAPE_UPDATED", { shape });
    },

    flushShapeUpdated(): void {
      for (const shapeId of [...pendingPreviews.keys()]) drainPreview(shapeId);
    },

    publishShapeDeleted(shapeId: string): void {
      cancelPendingPreviews(shapeId);
      shapes = shapes.filter((s) => s.id !== shapeId);
      emit();
      send("SHAPE_DELETED", { shape_id: shapeId });
    },

    publishClear(): void {
      cancelPendingPreviews();
      shapes = [];
      emit();
      send("CANVAS_CLEARED", {});
    },

    publishUndo(): void {
      cancelPendingPreviews();
      send("UNDO", {});
    },

    publishRedo(): void {
      cancelPendingPreviews();
      send("REDO", {});
    },

    replaceShapes(next: WhiteboardShape[]): void {
      shapes = next;
      emit();
    },

    cancelPendingUpdates(): void {
      cancelPendingPreviews();
    },

    reset(): void {
      cancelPendingPreviews();
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
