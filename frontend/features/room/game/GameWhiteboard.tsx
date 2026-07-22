"use client";

import * as React from "react";
import {
  DRAWER_WHITEBOARD_UI,
  Whiteboard,
  type WhiteboardController,
  type WhiteboardShape,
} from "@/features/whiteboard";
import { createCanvasSyncClient, type CanvasSyncClient } from "@/features/whiteboard/sync";
import { isValidShape } from "@/features/whiteboard/serialize";

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
  currentTurn,
  className,
  fill = false,
  headerInfo,
  aside,
}: {
  playerId: string;
  isDrawer: boolean;
  sessionId: string | null;
  /** Monotonic drawing epoch — wipe local canvas when the seat advances. */
  currentTurn: number;
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

  React.useEffect(() => {
    isDrawerRef.current = isDrawer;
  }, [isDrawer]);

  React.useEffect(() => {
    const sync = createCanvasSyncClient();
    syncRef.current = sync;
    if (sessionId) sync.setExpectedSessionId(sessionId);

    // Subscribe first so a fast snapshot response cannot race the listener.
    const stopCanvas = sync.attach({
      onEvent: (type, payload, nextShapes) => {
        const ctrl = controllerRef.current;
        if (!ctrl) return;

        if (type === "CANVAS_CLEAR" || type === "CANVAS_CLEARED") {
          ctrl.applyRemoteClear();
          return;
        }

        if (type === "CANVAS_SNAPSHOT") {
          ctrl.loadShapes(nextShapes);
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

        // Drawer already applied undo/redo locally; remotes use authoritative list.
        if (type === "UNDO" || type === "REDO") {
          if (!isDrawerRef.current) ctrl.loadShapes(nextShapes);
        }
      },
    });

    // JOIN already sends CANVAS_SNAPSHOT; re-request covers remount / gaps.
    sync.requestSnapshot();

    return () => {
      stopCanvas();
      sync.reset();
      syncRef.current = null;
    };
  }, [sessionId]);

  // New drawing seat: wipe local document (server also clears via CANVAS_CLEARED).
  // Use currentTurn (not display round) so overtime late-join draws still reset.
  React.useEffect(() => {
    syncRef.current?.cancelPendingUpdates();
    controllerRef.current?.loadShapes([]);
  }, [sessionId, currentTurn]);

  return (
    <Whiteboard
      className={className}
      playerId={playerId}
      isDrawer={isDrawer}
      showToolbar={isDrawer}
      fill={fill}
      immersive
      // Same drawer chrome as `/demo` (see DRAWER_WHITEBOARD_UI).
      {...(isDrawer ? DRAWER_WHITEBOARD_UI : {})}
      headerInfo={headerInfo}
      aside={aside}
      controllerRef={controllerRef}
      onShapePreview={(shape) => syncRef.current?.publishShapePreview(shape)}
      onShapePreviewCancelled={(shapeId) =>
        syncRef.current?.cancelShapePreview(shapeId)
      }
      onShapeCreated={(shape) => syncRef.current?.publishShapeCreated(shape)}
      onShapeUpdated={(shape) => syncRef.current?.publishShapeUpdated(shape)}
      onShapeDeleted={(shapeId) => syncRef.current?.publishShapeDeleted(shapeId)}
      onClear={() => syncRef.current?.publishClear()}
      onUndo={() => syncRef.current?.publishUndo()}
      onRedo={() => syncRef.current?.publishRedo()}
    />
  );
}
