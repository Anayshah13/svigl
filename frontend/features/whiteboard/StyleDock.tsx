"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  PRESET_COLORS,
  STROKE_WIDTHS,
  type StrokeWidth,
  type WhiteboardTool,
} from "./types";

function MoreColorsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#EF4444" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#3B82F6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#22C55E" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#EAB308" />
    </svg>
  );
}

interface SwatchProps {
  color: string;
  active: boolean;
  onSelect: (color: string) => void;
  size?: "sm" | "md";
}

function Swatch({ color, active, onSelect, size = "md" }: SwatchProps) {
  const isWhite = color.toLowerCase() === "#ffffff";
  return (
    <button
      type="button"
      title={color}
      aria-label={`Stroke color ${color}`}
      aria-pressed={active}
      onClick={() => onSelect(color)}
      className={cn(
        "shrink-0 touch-manipulation rounded-full border-2 transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
        size === "md"
          ? "h-11 w-11 sm:h-9 sm:w-9"
          : "h-8 w-8",
        active ? "scale-110 border-ink" : "border-black/10 hover:scale-105",
        isWhite && "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
      )}
      style={{ backgroundColor: color }}
    />
  );
}

export function StyleDock({
  color,
  onColorChange,
  strokeColor,
  strokeWidth,
  onStrokeWidthChange,
  floating = false,
  compact = false,
  className,
  colors,
  colorSheets,
  showColorPicker = true,
}: {
  /** Kept for call-site compatibility; no longer gates dock layout. */
  tool?: WhiteboardTool;
  /** Active palette color (stroke). */
  color: string;
  onColorChange: (color: string) => void;
  strokeColor?: string;
  /** @deprecated Fill slot removed from bottom dock; prop ignored. */
  fillColor?: string | "none";
  /** @deprecated Fill slot removed from bottom dock; prop ignored. */
  colorTarget?: "stroke" | "fill";
  /** @deprecated Fill slot removed from bottom dock; prop ignored. */
  onColorTargetChange?: (target: "stroke" | "fill") => void;
  /** @deprecated Fill slot removed from bottom dock; prop ignored. */
  onFillNone?: () => void;
  strokeWidth: StrokeWidth;
  onStrokeWidthChange: (w: StrokeWidth) => void;
  /** @deprecated Grid is always on; prop ignored. */
  snapToGrid?: boolean;
  /** @deprecated Grid is always on; prop ignored. */
  onSnapToGridChange?: (enabled: boolean) => void;
  /** @deprecated Fill tolerance is a fixed constant; prop ignored. */
  fillTolerance?: number;
  /** @deprecated Fill tolerance is a fixed constant; prop ignored. */
  onFillToleranceChange?: (n: number) => void;
  /** Compact floating palette (mobile). */
  floating?: boolean;
  /**
   * Collapse the dock to a single active-color swatch that opens a full
   * popover with every color + stroke width. Ideal for tight mobile toolbars.
   */
  compact?: boolean;
  className?: string;
  /** Override the default brand presets (single visible row). */
  colors?: readonly string[];
  /**
   * Extra manual color sheets. When set, a "More" button reveals them.
   * `colors` (or sheet[0]) remains the primary row.
   */
  colorSheets?: readonly (readonly string[])[];
  /** Native `<input type="color">` picker. Off for sketch/demo palettes. */
  showColorPicker?: boolean;
}) {
  const pickerRef = React.useRef<HTMLInputElement>(null);
  const compactContainerRef = React.useRef<HTMLDivElement>(null);
  const [sheetsOpen, setSheetsOpen] = React.useState(false);
  const [compactOpen, setCompactOpen] = React.useState(false);

  const primaryColors = colors ?? colorSheets?.[0] ?? PRESET_COLORS;
  const extraSheets = colorSheets?.slice(1) ?? [];
  const hasMoreSheets = extraSheets.length > 0;
  const allColors = React.useMemo(
    () => [...primaryColors, ...extraSheets.flat()],
    [primaryColors, extraSheets],
  );
  const activeColor = strokeColor ?? color;

  React.useEffect(() => {
    if (!sheetsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetsOpen]);

  React.useEffect(() => {
    if (!compactOpen) return;
    const onDoc = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target || !compactContainerRef.current) return;
      if (!compactContainerRef.current.contains(target)) setCompactOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompactOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [compactOpen]);

  if (compact) {
    const activeIsWhite = activeColor.toLowerCase() === "#ffffff";
    return (
      <div
        ref={compactContainerRef}
        className={cn("relative inline-flex", className)}
      >
        <button
          type="button"
          aria-label="Colors and stroke width"
          aria-haspopup="dialog"
          aria-expanded={compactOpen}
          onClick={() => setCompactOpen((v) => !v)}
          className={cn(
            "relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-2xl border-2 shadow-sm transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
            compactOpen
              ? "border-plum bg-plum-light/50"
              : "border-plum/25 bg-white hover:border-plum",
          )}
        >
          <span
            className={cn(
              "block h-6 w-6 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]",
              activeIsWhite && "shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",
            )}
            style={{ backgroundColor: activeColor }}
          />
        </button>

        {compactOpen ? (
          <div
            role="dialog"
            aria-label="Colors and stroke width"
            className="absolute bottom-full left-0 z-50 mb-2 w-[min(17.5rem,calc(100vw-1.5rem))] max-h-[min(22rem,calc(100dvh-7rem))] overflow-y-auto overscroll-contain rounded-2xl border border-plum/15 bg-white p-3 shadow-lg"
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Colors
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {allColors.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  active={activeColor.toLowerCase() === c.toLowerCase()}
                  size="sm"
                  onSelect={(v) => {
                    onColorChange(v);
                    setCompactOpen(false);
                  }}
                />
              ))}
              {showColorPicker ? (
                <button
                  type="button"
                  title="Custom color"
                  aria-label="Custom color picker"
                  onClick={() => pickerRef.current?.click()}
                  className={cn(
                    "relative inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-plum/40",
                    "hover:border-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
                  )}
                  style={{
                    background: `conic-gradient(#ED7FB8, #BBE331, #3B82F6, #EF4444, #ED7FB8)`,
                  }}
                >
                  <input
                    ref={pickerRef}
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(activeColor)
                        ? activeColor
                        : "#2C2C2C"
                    }
                    onChange={(e) => onColorChange(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    tabIndex={-1}
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>

            <div className="mt-3 border-t border-plum/10 pt-2">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Stroke
              </p>
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
                      "inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
                      strokeWidth === w
                        ? "bg-plum text-white"
                        : "bg-white text-ink hover:bg-plum-light/70",
                    )}
                  >
                    <span
                      className="block rounded-full bg-current"
                      style={{
                        width: Math.max(6, w + 2),
                        height: Math.max(6, w + 2),
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Stroke and color"
      className={cn(
        "relative flex flex-wrap items-center gap-2 rounded-2xl border border-plum/15 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm",
        floating && "max-w-[min(100%,24rem)]",
        className,
      )}
    >
      <div className="relative" role="group" aria-label="Colors">
        <div className="flex flex-wrap items-center gap-1.5">
          {primaryColors.map((c) => (
            <Swatch
              key={c}
              color={c}
              active={activeColor.toLowerCase() === c.toLowerCase()}
              onSelect={(v) => {
                onColorChange(v);
                setSheetsOpen(false);
              }}
            />
          ))}

          {hasMoreSheets ? (
            <button
              type="button"
              title="More colors"
              aria-label="More color sheets"
              aria-expanded={sheetsOpen}
              onClick={() => setSheetsOpen((v) => !v)}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border-2 border-plum/25 bg-white sm:h-9 sm:w-9",
                "hover:border-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
                sheetsOpen && "border-plum bg-plum-light/50",
              )}
            >
              <MoreColorsIcon className="h-5 w-5" />
            </button>
          ) : null}

          {showColorPicker ? (
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
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(activeColor) ? activeColor : "#2C2C2C"
                }
                onChange={(e) => onColorChange(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                tabIndex={-1}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        {sheetsOpen && hasMoreSheets ? (
          <>
            <button
              type="button"
              aria-label="Close color sheets"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={() => setSheetsOpen(false)}
            />
            <div
              role="dialog"
              aria-label="More colors"
              className="absolute bottom-full left-0 z-50 mb-2 w-max max-w-none -translate-x-2 rounded-2xl border border-plum/15 bg-white px-2.5 py-2 shadow-lg sm:-translate-x-3"
            >
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                More colors
              </p>
              <div
                className="flex flex-nowrap items-center gap-1.5"
                role="group"
                aria-label="Extra colors"
              >
                {extraSheets.flat().map((c) => (
                  <Swatch
                    key={c}
                    color={c}
                    active={activeColor.toLowerCase() === c.toLowerCase()}
                    onSelect={(v) => {
                      onColorChange(v);
                      setSheetsOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
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
    </div>
  );
}
