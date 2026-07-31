"use client";

import * as React from "react";
import {
  DRAWER_WHITEBOARD_UI,
  Whiteboard,
  type WhiteboardController,
} from "@/features/whiteboard";
import { createCanvasSyncClient, type CanvasSyncClient } from "@/features/whiteboard/sync";
import { normalizeShape } from "@/features/whiteboard/serialize";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";

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
  /** Skip WS sync — local canvas only (demo / layout testing). */
  localOnly = false,
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
  localOnly?: boolean;
}) {
  const controllerRef = React.useRef<WhiteboardController | null>(null);
  const syncRef = React.useRef<CanvasSyncClient | null>(null);
  const isDrawerRef = React.useRef(isDrawer);
  /** Fire `player_drew` once per drawing seat (session + turn), not per stroke. */
  const drewKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    isDrawerRef.current = isDrawer;
  }, [isDrawer]);

  React.useEffect(() => {
    if (localOnly) return;

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
          const shape = normalizeShape(payload.shape);
          if (shape) {
            ctrl.applyRemoteShape(shape);
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
  }, [sessionId, localOnly]);

  // New drawing seat: wipe local document (server also clears via CANVAS_CLEARED).
  // Use currentTurn (not display round) so overtime late-join draws still reset.
  React.useEffect(() => {
    if (localOnly) return;
    syncRef.current?.cancelPendingUpdates();
    controllerRef.current?.loadShapes([]);
  }, [sessionId, currentTurn, localOnly]);

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
      onShapePreview={
        localOnly
          ? undefined
          : (shape) => syncRef.current?.publishShapePreview(shape)
      }
      onShapePreviewCancelled={
        localOnly
          ? undefined
          : (shapeId) => syncRef.current?.cancelShapePreview(shapeId)
      }
      onShapeCreated={
        localOnly
          ? undefined
          : (shape) => {
              syncRef.current?.publishShapeCreated(shape);
              const key = `${sessionId ?? "none"}:${currentTurn}`;
              if (drewKeyRef.current !== key) {
                drewKeyRef.current = key;
                trackEvent(AnalyticsEvents.PLAYER_DREW, {
                  turn: currentTurn,
                });
              }
            }
      }
      onShapeUpdated={
        localOnly
          ? undefined
          : (shape) => syncRef.current?.publishShapeUpdated(shape)
      }
      onShapeDeleted={
        localOnly
          ? undefined
          : (shapeId) => syncRef.current?.publishShapeDeleted(shapeId)
      }
      onClear={localOnly ? undefined : () => syncRef.current?.publishClear()}
      onUndo={localOnly ? undefined : () => syncRef.current?.publishUndo()}
      onRedo={localOnly ? undefined : () => syncRef.current?.publishRedo()}
    />
  );
}
