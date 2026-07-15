"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { WhiteboardToolbar } from "./WhiteboardToolbar";
import {
  useWhiteboard,
  type UseWhiteboardOptions,
  type WhiteboardController,
} from "./useWhiteboard";

export interface WhiteboardProps extends UseWhiteboardOptions {
  className?: string;
  /** Hide toolbar (e.g. spectator layout controlled elsewhere). */
  showToolbar?: boolean;
  /**
   * Grow to fill a flex parent: canvas takes remaining height, toolbar stays
   * below (Skribbl-style). When false, canvas uses a 4:3 aspect box.
   */
  fill?: boolean;
  /** Access the controller for sync / round resets (Agent F wiring). */
  controllerRef?: React.MutableRefObject<WhiteboardController | null>;
}

/**
 * Production SVG whiteboard. Pass `isDrawer={false}` for read-only spectators.
 *
 * Sync surface (do not wire WebSockets here — leave to game layer):
 * - onShapeCreated / onShapeUpdated / onShapeDeleted
 * - onClear / onUndo / onRedo
 * - onShapesChange (throttled ~30fps snapshot)
 *
 * Imperative API via `controllerRef`:
 * - loadShapes / importDocument / exportDocument
 * - applyRemoteShape / applyRemoteDelete / applyRemoteClear
 */
export function Whiteboard({
  className,
  showToolbar = true,
  fill = false,
  controllerRef,
  ...options
}: WhiteboardProps) {
  const controller = useWhiteboard(options);

  if (controllerRef) {
    controllerRef.current = controller;
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2",
        fill ? "h-full min-h-0" : null,
        className,
      )}
    >
      <WhiteboardCanvas
        controller={controller}
        className={
          fill
            ? "min-h-0 w-full flex-1"
            : "aspect-[4/3] w-full"
        }
      />
      {showToolbar ? (
        <WhiteboardToolbar
          tool={controller.tool}
          onToolChange={controller.setTool}
          color={controller.color}
          onColorChange={controller.setColor}
          strokeWidth={controller.strokeWidth}
          onStrokeWidthChange={controller.setStrokeWidth}
          fillTolerance={controller.fillTolerance}
          onFillToleranceChange={controller.setFillTolerance}
          canUndo={controller.canUndo}
          canRedo={controller.canRedo}
          onUndo={controller.undo}
          onRedo={controller.redo}
          onClear={controller.clear}
          disabled={!controller.isDrawer}
          className="shrink-0"
        />
      ) : null}
    </div>
  );
}
