"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { PRESET_COLORS, STROKE_WIDTHS, type StrokeWidth, type WhiteboardTool } from "./types";

const TOOLS: { id: WhiteboardTool; label: string; icon: React.ReactNode }[] = [
  {
    id: "bezier",
    label: "Curve",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18C4 10 10 6 12 10s8-2 8 6" strokeLinecap="round" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="6" width="16" height="12" rx="1" />
      </svg>
    ),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="12" rx="8" ry="6" />
      </svg>
    ),
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h14" strokeLinecap="round" />
        <path d="M14 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "fill",
    label: "Fill",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3l9 9-5 5-9-9 5-5z" strokeLinejoin="round" />
        <path d="M16 16c1.5 1.5 3 2 4 1s.5-2.5-1-4" strokeLinecap="round" />
      </svg>
    ),
  },
];

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

function ToolButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-all duration-150 sm:h-10 sm:w-10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-plum text-white shadow-sm"
          : "bg-white/80 text-ink hover:bg-plum-light/70",
      )}
    >
      {children}
    </button>
  );
}

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
  onClear,
  disabled = false,
  className,
}: WhiteboardToolbarProps) {
  const pickerRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-plum/15 bg-white/90 px-2 py-2 shadow-sm backdrop-blur-sm touch-pan-x sm:gap-3 sm:px-3 sm:py-2.5",
        className,
      )}
      role="toolbar"
      aria-label="Whiteboard tools"
      aria-disabled={disabled}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            label={t.label}
            active={tool === t.id}
            disabled={disabled}
            onClick={() => onToolChange(t.id)}
          >
            {t.icon}
          </ToolButton>
        ))}
      </div>

      <div className="hidden h-8 w-px bg-plum/15 sm:block" aria-hidden />

      <div className="flex items-center gap-1.5" role="group" aria-label="Colors">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={color.toLowerCase() === c.toLowerCase()}
            disabled={disabled}
            onClick={() => onColorChange(c)}
            className={cn(
              "h-8 w-8 shrink-0 touch-manipulation rounded-full border-2 transition-transform duration-150 sm:h-7 sm:w-7",
              "disabled:pointer-events-none disabled:opacity-40",
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
          disabled={disabled}
          onClick={() => pickerRef.current?.click()}
          className={cn(
            "relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-plum/40",
            "disabled:pointer-events-none disabled:opacity-40",
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
            disabled={disabled}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </button>
      </div>

      <div className="hidden h-8 w-px bg-plum/15 sm:block" aria-hidden />

      <div className="flex items-center gap-1.5" role="group" aria-label="Stroke width">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            title={`Stroke ${w}px`}
            aria-label={`Stroke width ${w}`}
            aria-pressed={strokeWidth === w}
            disabled={disabled}
            onClick={() => onStrokeWidthChange(w)}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-all sm:h-10 sm:w-10",
              "disabled:pointer-events-none disabled:opacity-40",
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

      {tool === "fill" ? (
        <>
          <div className="hidden h-8 w-px bg-plum/15 sm:block" aria-hidden />
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            Tolerance
            <input
              type="range"
              min={0}
              max={80}
              value={fillTolerance}
              disabled={disabled}
              onChange={(e) => onFillToleranceChange(Number(e.target.value))}
              className="w-20 accent-plum disabled:opacity-40"
              aria-label="Fill tolerance"
            />
            <span className="w-6 tabular-nums text-ink">{fillTolerance}</span>
          </label>
        </>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <ToolButton label="Undo" disabled={disabled || !canUndo} onClick={onUndo}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 7H5v4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 11a7 7 0 1 0 2-5" strokeLinecap="round" />
          </svg>
        </ToolButton>
        <ToolButton label="Redo" disabled={disabled || !canRedo} onClick={onRedo}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 11a7 7 0 1 1-2-5" strokeLinecap="round" />
          </svg>
        </ToolButton>
        <ToolButton label="Clear board" disabled={disabled} onClick={onClear}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 7h14" strokeLinecap="round" />
            <path d="M9 7V5h6v2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 7l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </ToolButton>
      </div>
    </div>
  );
}
