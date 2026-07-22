"use client";

import { cn } from "@/lib/cn";
import { TOOL_BY_ID } from "./toolMeta";
import type { WhiteboardShape, WhiteboardTool } from "./types";
import type { WhiteboardController } from "./useWhiteboard";

function shapeTypeLabel(shape: WhiteboardShape): string {
  switch (shape.geometry.kind) {
    case "bezier":
      return "Curve";
    case "rectangle":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "arrow":
      return "Arrow";
    case "fill":
      return "Fill";
    default:
      return "Shape";
  }
}

function geometrySummary(shape: WhiteboardShape): string {
  const g = shape.geometry;
  switch (g.kind) {
    case "bezier":
      return `From (${Math.round(g.start.x)}, ${Math.round(g.start.y)}) → (${Math.round(g.end.x)}, ${Math.round(g.end.y)})`;
    case "rectangle":
      return `${Math.round(g.width)}×${Math.round(g.height)} at (${Math.round(g.x)}, ${Math.round(g.y)})`;
    case "ellipse":
      return `Center (${Math.round(g.cx)}, ${Math.round(g.cy)}) · r ${Math.round(g.rx)}×${Math.round(g.ry)}`;
    case "arrow":
      return `From (${Math.round(g.start.x)}, ${Math.round(g.start.y)}) → (${Math.round(g.end.x)}, ${Math.round(g.end.y)})`;
    case "fill":
      return "Flood-fill region";
    default:
      return "—";
  }
}

function QuickAction({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border border-plum/15 bg-white px-3 py-2 text-left text-xs font-semibold text-ink transition-colors",
        "hover:bg-plum-light/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
        "disabled:pointer-events-none disabled:opacity-35",
      )}
    >
      {label}
    </button>
  );
}

export function PropertiesPanel({
  controller,
  variant = "dock",
  onClose,
  className,
}: {
  controller: WhiteboardController;
  /** Desktop side dock vs mobile bottom sheet. */
  variant?: "dock" | "sheet";
  onClose?: () => void;
  className?: string;
}) {
  const selected =
    controller.selectedId != null
      ? controller.shapes.find((s) => s.id === controller.selectedId) ?? null
      : null;
  const toolMeta = TOOL_BY_ID[controller.tool as WhiteboardTool];

  return (
    <aside
      aria-label="Shape properties"
      className={cn(
        "flex flex-col gap-3 border-plum/15 bg-white/95 text-ink shadow-sm backdrop-blur-sm",
        variant === "dock" && "rounded-2xl border p-3",
        variant === "sheet" &&
          "rounded-t-3xl border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-plum">
            Properties
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {selected ? shapeTypeLabel(selected) : "No selection"}
          </p>
        </div>
        {variant === "sheet" && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl text-sm font-semibold text-ink-muted hover:bg-plum-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            aria-label="Close properties"
          >
            Close
          </button>
        ) : null}
      </div>

      {selected ? (
        <dl className="grid gap-2 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">Stroke</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: selected.stroke }}
                aria-hidden
              />
              {selected.stroke}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">Fill</dt>
            <dd className="font-medium">
              {selected.fill === "none" ? "None" : selected.fill}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">Stroke width</dt>
            <dd className="font-medium">{selected.strokeWidth}px</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-muted">Geometry</dt>
            <dd className="font-medium leading-snug">{geometrySummary(selected)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-muted">Transform</dt>
            <dd className="break-all font-mono text-[10px] font-medium leading-snug">
              {selected.transform || "none"}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="rounded-xl bg-plum-light/50 px-3 py-2.5 text-xs leading-relaxed text-ink">
          <p className="font-semibold">Choose a tool</p>
          <p className="mt-1 text-ink-muted">
            {toolMeta?.hint ?? "Drag on the canvas to draw."}
          </p>
          <p className="mt-2 text-ink-muted">
            Tip: press <kbd className="rounded bg-white px-1 font-mono">V</kbd> for
            Selection to move or edit shapes.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <QuickAction
          label="Delete"
          disabled={!controller.canDelete}
          onClick={controller.deleteSelected}
        />
        <QuickAction
          label="Duplicate"
          disabled={!controller.canDuplicate}
          onClick={controller.duplicateSelected}
        />
        <QuickAction
          label="Bring forward"
          disabled={!controller.canBringForward}
          onClick={controller.bringForward}
        />
        <QuickAction
          label="Send backward"
          disabled={!controller.canSendBackward}
          onClick={controller.sendBackward}
        />
        <QuickAction
          label="Copy"
          disabled={!controller.canCopy}
          onClick={controller.copySelected}
        />
        <QuickAction
          label="Paste"
          disabled={!controller.canPaste}
          onClick={controller.pasteClipboard}
        />
      </div>

      {selected ? (
        <p className="text-[11px] leading-relaxed text-ink-muted">
          Drag to move · corner handles resize · green diamonds edit curve controls ·
          arrows nudge (±1, Shift ±10)
        </p>
      ) : null}
    </aside>
  );
}
