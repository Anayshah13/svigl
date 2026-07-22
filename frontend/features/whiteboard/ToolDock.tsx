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
}: {
  tool: WhiteboardTool;
  onToolChange: (tool: WhiteboardTool) => void;
  orientation?: "vertical" | "horizontal";
  className?: string;
  bezierAsLine?: boolean;
}) {
  const vertical = orientation === "vertical";

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className={cn(
        "flex gap-1 rounded-2xl border border-plum/15 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm",
        vertical ? "flex-col" : "flex-row overflow-x-auto overscroll-x-contain touch-pan-x",
        className,
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
              "group flex shrink-0 touch-manipulation items-center gap-2 rounded-xl px-2.5 transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
              vertical
                ? "min-h-11 w-full min-w-[7.5rem] py-2"
                : "min-h-11 min-w-[4.75rem] flex-col justify-center gap-0.5 px-2.5 py-1.5",
              active
                ? "bg-plum text-white shadow-sm"
                : "bg-transparent text-ink hover:bg-plum-light/80",
            )}
          >
            <ToolIcon
              tool={t.id}
              className="h-5 w-5 shrink-0"
              bezierAsLine={bezierAsLine}
            />
            <span
              className={cn(
                "flex min-w-0 flex-col text-left",
                !vertical && "items-center text-center",
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
          </button>
        );
      })}
    </div>
  );
}
