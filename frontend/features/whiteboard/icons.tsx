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
      <line
        x1="4"
        y1="18"
        x2="12"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="2 2"
        opacity="0.7"
      />
      <line
        x1="20"
        y1="18"
        x2="12"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="2 2"
        opacity="0.7"
      />
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="20" cy="18" r="2" fill="currentColor" />
      <rect
        x="10.75"
        y="4.75"
        width="2.5"
        height="2.5"
        rx="0.4"
        fill="currentColor"
        opacity="0.85"
        transform="rotate(45 12 6)"
      />
    </svg>
  );
}

/** Freehand pencil glyph — angled tip, optically centered in 24×24. */
export function PencilIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13.5 4.5l6 6L8 22H2v-6L13.5 4.5z" />
      <path d="M11.5 6.5l6 6" />
    </svg>
  );
}

/** Straight-line glyph used when the bezier tool is labeled "Line" in demo UI. */
export function LineIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M5 19L19 5" strokeLinecap="round" />
    </svg>
  );
}

function RectIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="5" y="6" width="14" height="12" rx="1.5" />
    </svg>
  );
}

function EllipseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <ellipse cx="12" cy="12" rx="7.5" ry="5.5" />
    </svg>
  );
}

function FillIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M8 3.5l8.5 8.5-4.5 4.5L3.5 8 8 3.5z"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 15.5c1.4 1.4 2.8 1.9 3.7 1 0.9-0.9 0.4-2.3-1-3.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SelectIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 3.5l5 15 2.3-5.5L19 10.5 6 3.5z" strokeLinejoin="round" />
    </svg>
  );
}

function EraserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M15.5 4l4 4-10.5 10.5H5.5l-2-2L15.5 4z"
        strokeLinejoin="round"
      />
      <path d="M8 20h10" strokeLinecap="round" />
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
    case "pencil":
      return <PencilIcon className={className} />;
    case "select":
      return <SelectIcon className={className} />;
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
    case "fill":
      return <FillIcon className={className} />;
    case "eraser":
      return <EraserIcon className={className} />;
  }
}

export function UndoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 7H5v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11a7 7 0 1 0 2-5" strokeLinecap="round" />
    </svg>
  );
}

export function RedoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M15 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 11a7 7 0 1 1-2-5" strokeLinecap="round" />
    </svg>
  );
}
