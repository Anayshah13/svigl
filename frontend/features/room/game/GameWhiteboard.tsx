"use client";

import * as React from "react";
import {
  Whiteboard,
  type WhiteboardController,
  type WhiteboardShape,
} from "@/features/whiteboard";
import { createCanvasSyncClient, type CanvasSyncClient } from "@/features/whiteboard/sync";
import { importShapes, isValidShape } from "@/features/whiteboard/serialize";
import { appWebSocket } from "@/services/app-websocket";

/**
 * Bridges the SVG whiteboard to collaborative canvas sync.
 *
 * - Local strokes publish via createCanvasSyncClient (throttled ~30fps).
 * - Remote ops apply with applyRemote* so the drawer's undo stack stays intact.
 * - Snapshots / undo-redo authoritative lists use loadShapes.
 */
export function GameWhiteboard({
  playerId,
  isDrawer,
  sessionId,
  roundNumber,
  className,
  fill = false,
  headerInfo,
  aside,
}: {
  playerId: string;
  isDrawer: boolean;
  sessionId: string | null;
  roundNumber: number;
  className?: string;
  /** Fill parent height; drawer chrome wraps the canvas. */
  fill?: boolean;
  /** Round / timer / word for drawer top bar. */
  headerInfo?: React.ReactNode;
  /** Chat (and similar) for drawer right column. */
  aside?: React.ReactNode;
}) {
  const controllerRef = React.useRef<WhiteboardController | null>(null);
  const syncRef = React.useRef<CanvasSyncClient | null>(null);
  const isDrawerRef = React.useRef(isDrawer);
  isDrawerRef.current = isDrawer;

  React.useEffect(() => {
    const sync = createCanvasSyncClient();
    syncRef.current = sync;

    // JOIN already sends CANVAS_SNAPSHOT; re-request covers remount / gaps.
    sync.requestSnapshot();

    const stopCanvas = appWebSocket.subscribeCanvas((type, payload) => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;

      if (type === "CANVAS_CLEAR" || type === "CANVAS_CLEARED") {
        sync.reset();
        ctrl.applyRemoteClear();
        return;
      }

      if (type === "CANVAS_SNAPSHOT") {
        sync.applySnapshot(payload);
        try {
          const shapes = Array.isArray(payload.shapes)
            ? importShapes(payload.shapes)
            : [];
          ctrl.loadShapes(shapes);
        } catch {
          ctrl.loadShapes([]);
        }
        return;
      }

      if (type === "SHAPE_CREATED" || type === "SHAPE_UPDATED") {
        const shape = payload.shape;
        if (isValidShape(shape)) {
          ctrl.applyRemoteShape(shape as WhiteboardShape);
        }
        return;
      }

      if (type === "SHAPE_DELETED") {
        const id =
          typeof payload.shape_id === "string"
            ? payload.shape_id
            : typeof payload.shapeId === "string"
              ? payload.shapeId
              : null;
        if (id) ctrl.applyRemoteDelete(id);
        return;
      }

      // Drawer already applied undo/redo locally; loadShapes would wipe HistoryStack.
      if ((type === "UNDO" || type === "REDO") && Array.isArray(payload.shapes)) {
        if (isDrawerRef.current) return;
        try {
          ctrl.loadShapes(importShapes(payload.shapes));
        } catch {
          /* ignore corrupt remote undo/redo payload */
        }
      }
    });

    return () => {
      stopCanvas();
      sync.reset();
      syncRef.current = null;
    };
  }, [sessionId]);

  // New turn / round: wipe local document (server also clears via CANVAS_CLEARED).
  React.useEffect(() => {
    syncRef.current?.reset();
    controllerRef.current?.loadShapes([]);
  }, [sessionId, roundNumber]);

  return (
    <Whiteboard
      className={className}
      playerId={playerId}
      isDrawer={isDrawer}
      showToolbar={isDrawer}
      fill={fill}
      immersive
      headerInfo={headerInfo}
      aside={aside}
      controllerRef={controllerRef}
      onShapeCreated={(shape) => syncRef.current?.publishShapeCreated(shape)}
      onShapeUpdated={(shape) => syncRef.current?.publishShapeUpdated(shape)}
      onShapeDeleted={(shapeId) => syncRef.current?.publishShapeDeleted(shapeId)}
      onClear={() => syncRef.current?.publishClear()}
      onUndo={() => syncRef.current?.publishUndo()}
      onRedo={() => syncRef.current?.publishRedo()}
    />
  );
}
