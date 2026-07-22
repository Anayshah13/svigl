import type { WhiteboardTool } from "./types";

/** Signature Svigl curve icon: two endpoints, two control handles, one curved path. */
export function CurveIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M4 18 C 7 6, 10 6, 12 12 S 17 20, 20 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Control handle stems */}
      <line x1="4" y1="18" x2="7" y2="8" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2" opacity="0.7" />
      <line x1="20" y1="8" x2="17" y2="16" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2" opacity="0.7" />
      {/* Endpoints */}
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="20" cy="8" r="2" fill="currentColor" />
      {/* Control handles — distinct diamond-ish via squares */}
      <rect x="5.75" y="6.75" width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.85" />
      <rect x="15.75" y="14.75" width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.85" />
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

export function ToolIcon({
  tool,
  className,
}: {
  tool: WhiteboardTool;
  className?: string;
}) {
  switch (tool) {
    case "select":
      return <SelectIcon className={className} />;
    case "bezier":
      return <CurveIcon className={className} />;
    case "rectangle":
      return <RectIcon className={className} />;
    case "ellipse":
      return <EllipseIcon className={className} />;
    case "arrow":
      return <ArrowIcon className={className} />;
    case "fill":
      return <FillIcon className={className} />;
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
