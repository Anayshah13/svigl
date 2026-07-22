"use client";

/**
 * Legacy toolbar facade — prefer ToolDock + StyleDock + ActionBar.
 * Kept so existing imports continue to work.
 */
import { cn } from "@/lib/cn";
import { ActionBar } from "./ActionBar";
import { StyleDock } from "./StyleDock";
import { ToolDock } from "./ToolDock";
import type { StrokeWidth, WhiteboardTool } from "./types";
import type { WhiteboardController } from "./useWhiteboard";

export interface WhiteboardToolbarProps {
  tool: WhiteboardTool;
  onToolChange: (tool: WhiteboardTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: StrokeWidth;
  onStrokeWidthChange: (w: StrokeWidth) => void;
  fillTolerance: number;
  onFillToleranceChange: (n: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
}

/** @deprecated Prefer immersive Whiteboard chrome (ToolDock / StyleDock). */
export function WhiteboardToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fillTolerance,
  onFillToleranceChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  disabled = false,
  className,
}: WhiteboardToolbarProps) {
  if (disabled) return null;

  const stubController = {
    canUndo,
    canRedo,
    canCopy: false,
    canPaste: false,
    canDelete: false,
    undo: onUndo,
    redo: onRedo,
    copySelected: () => {},
    pasteClipboard: () => {},
    deleteSelected: () => {},
  } as WhiteboardController;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-start gap-2">
        <ToolDock
          tool={tool}
          onToolChange={onToolChange}
          orientation="horizontal"
        />
        <ActionBar controller={stubController} />
      </div>
      <StyleDock
        tool={tool}
        color={color}
        onColorChange={onColorChange}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={onStrokeWidthChange}
        fillTolerance={fillTolerance}
        onFillToleranceChange={onFillToleranceChange}
      />
    </div>
  );
}
