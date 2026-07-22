"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { PRESET_COLORS, STROKE_WIDTHS, type StrokeWidth, type WhiteboardTool } from "./types";

export function StyleDock({
  tool,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fillTolerance,
  onFillToleranceChange,
  floating = false,
  className,
}: {
  tool: WhiteboardTool;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: StrokeWidth;
  onStrokeWidthChange: (w: StrokeWidth) => void;
  fillTolerance: number;
  onFillToleranceChange: (n: number) => void;
  /** Compact floating palette (mobile). */
  floating?: boolean;
  className?: string;
}) {
  const pickerRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      role="toolbar"
      aria-label="Stroke and color"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-plum/15 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm",
        floating && "max-w-[min(100%,20rem)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Colors">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={color.toLowerCase() === c.toLowerCase()}
            onClick={() => onColorChange(c)}
            className={cn(
              "h-11 w-11 shrink-0 touch-manipulation rounded-full border-2 transition-transform duration-150 sm:h-9 sm:w-9",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
              color.toLowerCase() === c.toLowerCase()
                ? "scale-110 border-ink"
                : "border-black/10 hover:scale-105",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          type="button"
          title="Custom color"
          aria-label="Custom color picker"
          onClick={() => pickerRef.current?.click()}
          className={cn(
            "relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-plum/40 sm:h-9 sm:w-9",
            "hover:border-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
          )}
          style={{
            background: `conic-gradient(#ED7FB8, #BBE331, #3B82F6, #EF4444, #ED7FB8)`,
          }}
        >
          <input
            ref={pickerRef}
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#2C2C2C"}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </button>
      </div>

      {!floating ? (
        <>
          <div className="hidden h-8 w-px bg-plum/15 sm:block" aria-hidden />
          <div className="flex items-center gap-1.5" role="group" aria-label="Stroke width">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                title={`Stroke ${w}px`}
                aria-label={`Stroke width ${w}`}
                aria-pressed={strokeWidth === w}
                onClick={() => onStrokeWidthChange(w)}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-all sm:h-10 sm:w-10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
                  strokeWidth === w
                    ? "bg-plum text-white"
                    : "bg-white/80 text-ink hover:bg-plum-light/70",
                )}
              >
                <span
                  className="block rounded-full bg-current"
                  style={{ width: Math.max(6, w + 2), height: Math.max(6, w + 2) }}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {tool === "fill" ? (
        <>
          <div className="hidden h-8 w-px bg-plum/15 sm:block" aria-hidden />
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
            Tolerance
            <input
              type="range"
              min={0}
              max={80}
              value={fillTolerance}
              onChange={(e) => onFillToleranceChange(Number(e.target.value))}
              className="w-20 accent-plum"
              aria-label="Fill tolerance"
            />
            <span className="w-6 tabular-nums text-ink">{fillTolerance}</span>
          </label>
        </>
      ) : null}
    </div>
  );
}
