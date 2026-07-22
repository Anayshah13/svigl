import type { WhiteboardTool } from "./types";

/** Signature Svigl curve icon: two endpoints, one control handle, one curved path. */
export function CurveIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M4 18 C 8 6, 16 6, 20 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Control handle stems */}
      <line x1="4" y1="18" x2="12" y2="6" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2" opacity="0.7" />
      <line x1="20" y1="18" x2="12" y2="6" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2" opacity="0.7" />
      {/* Endpoints */}
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="20" cy="18" r="2" fill="currentColor" />
      {/* Single control handle */}
      <rect x="10.75" y="4.75" width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.85" transform="rotate(45 12 6)" />
    </svg>
  );
}

/** Straight-line glyph used when the bezier tool is labeled "Line" in demo UI. */
export function LineIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 19L19 5" strokeLinecap="round" />
    </svg>
  );
}

function RectIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="1" />
    </svg>
  );
}

function EllipseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <ellipse cx="12" cy="12" rx="8" ry="6" />
    </svg>
  );
}

function ArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 12h14" strokeLinecap="round" />
      <path d="M14 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FillIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 3l9 9-5 5-9-9 5-5z" strokeLinejoin="round" />
      <path d="M16 16c1.5 1.5 3 2 4 1s.5-2.5-1-4" strokeLinecap="round" />
    </svg>
  );
}

function SelectIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 3l5.5 16 2.5-6 6-2.5L5 3z" strokeLinejoin="round" />
    </svg>
  );
}

function EraserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M16.5 3.5l4 4-11 11H5.5l-2-2 13-13z"
        strokeLinejoin="round"
      />
      <path d="M8 20h11" strokeLinecap="round" />
    </svg>
  );
}

function HandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M8 11V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v6.5M14 10V6.5a1.5 1.5 0 0 1 3 0V14c0 3-2 5.5-5 5.5H10c-2.5 0-4.5-1.5-5.5-3.5L3 13a1.5 1.5 0 0 1 2.5-1.5L7 13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ToolIcon({
  tool,
  className,
  /** Demo-only visual: show bezier tool as a straight line. */
  bezierAsLine = false,
}: {
  tool: WhiteboardTool;
  className?: string;
  bezierAsLine?: boolean;
}) {
  switch (tool) {
    case "select":
      return <SelectIcon className={className} />;
    case "hand":
      return <HandIcon className={className} />;
    case "bezier":
      return bezierAsLine ? (
        <LineIcon className={className} />
      ) : (
        <CurveIcon className={className} />
      );
    case "rectangle":
      return <RectIcon className={className} />;
    case "ellipse":
      return <EllipseIcon className={className} />;
    case "arrow":
      return <ArrowIcon className={className} />;
    case "fill":
      return <FillIcon className={className} />;
    case "eraser":
      return <EraserIcon className={className} />;
  }
}

export function UndoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 7H5v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11a7 7 0 1 0 2-5" strokeLinecap="round" />
    </svg>
  );
}

export function RedoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 11a7 7 0 1 1-2-5" strokeLinecap="round" />
    </svg>
  );
}
