"use client";

import { cn } from "@/lib/cn";
import { ToolIcon } from "./icons";
import { TOOL_META } from "./toolMeta";
import type { WhiteboardTool } from "./types";

export function ToolDock({
  tool,
  onToolChange,
  orientation = "vertical",
  className,
  /** Demo-only: label/icon bezier as "Line" (logic unchanged). */
  bezierAsLine = false,
  /**
   * Slim mobile mode — icon-only buttons, no per-tool labels or shortcut
   * badges. Keeps the toolbar compact so it can share a row with the
   * color-picker button below the canvas.
   */
  iconOnly = false,
  /**
   * Wrap tools onto multiple rows instead of horizontal scrolling.
   * Used by the mobile drawer toolbar so every tool stays visible.
   */
  wrap = false,
}: {
  tool: WhiteboardTool;
  onToolChange: (tool: WhiteboardTool) => void;
  orientation?: "vertical" | "horizontal";
  className?: string;
  bezierAsLine?: boolean;
  iconOnly?: boolean;
  wrap?: boolean;
}) {
  const vertical = orientation === "vertical";
  const useContents = iconOnly && wrap;

  return (
    <div
      role={useContents ? undefined : "toolbar"}
      aria-label={useContents ? undefined : "Drawing tools"}
      className={cn(
        !iconOnly &&
          "flex gap-1 rounded-2xl border border-plum/15 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm",
        iconOnly && !useContents && "flex gap-1",
        useContents
          ? "contents"
          : vertical
            ? "flex-col"
            : wrap
              ? "flex-row flex-wrap"
              : "flex-row overflow-x-auto overscroll-x-contain touch-pan-x",
        !useContents && className,
      )}
    >
      {TOOL_META.map((t) => {
        const active = tool === t.id;
        const label =
          t.id === "bezier" && bezierAsLine ? "Line" : t.label;
        return (
          <button
            key={t.id}
            type="button"
            title={`${label} (${t.shortcut}) — ${t.tooltip}`}
            aria-label={`${label}, shortcut ${t.shortcut}`}
            aria-pressed={active}
            aria-keyshortcuts={t.shortcut}
            onClick={() => onToolChange(t.id)}
            className={cn(
              "group flex shrink-0 touch-manipulation rounded-xl transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
              iconOnly
                ? "h-11 w-11 min-w-11 items-center justify-center"
                : vertical
                  ? "min-h-11 w-full min-w-[7.5rem] items-center justify-start gap-2.5 px-2.5 py-2"
                  : "min-h-11 min-w-[4.75rem] flex-col items-center justify-center gap-0.5 px-2.5 py-1.5",
              active
                ? "bg-plum text-white shadow-sm"
                : "bg-transparent text-ink hover:bg-plum-light/80",
            )}
          >
            <span
              className={cn(
                "inline-flex shrink-0 items-center justify-center",
                iconOnly || !vertical ? "h-5 w-5" : "h-5 w-5",
              )}
              aria-hidden
            >
              <ToolIcon
                tool={t.id}
                className="h-5 w-5"
                bezierAsLine={bezierAsLine}
              />
            </span>
            {!iconOnly ? (
              <span
                className={cn(
                  "flex min-w-0 flex-col",
                  vertical ? "items-start text-left" : "items-center text-center",
                )}
              >
                <span className="truncate text-xs font-semibold leading-tight">
                  {label}
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] leading-tight",
                    active ? "text-white/75" : "text-ink-muted",
                  )}
                >
                  {t.shortcut}
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
