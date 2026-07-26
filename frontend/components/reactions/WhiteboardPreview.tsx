"use client";

import { ShapeList } from "@/features/whiteboard/ShapeRenderer";
import type { WhiteboardExport, WhiteboardShape } from "@/features/whiteboard/types";
import { WHITEBOARD_VIEWBOX } from "@/features/whiteboard/types";
import { cn } from "@/lib/cn";

function isWhiteboardDoc(value: unknown): value is WhiteboardExport {
  if (!value || typeof value !== "object") return false;
  const doc = value as Partial<WhiteboardExport>;
  return Array.isArray(doc.shapes);
}

/** Read-only whiteboard snapshot for gallery / profile cards. */
export function WhiteboardPreview({
  document,
  className,
}: {
  document: WhiteboardExport | null | undefined;
  className?: string;
}) {
  const shapes: WhiteboardShape[] = isWhiteboardDoc(document)
    ? document.shapes
    : [];
  const vb =
    isWhiteboardDoc(document) && document.viewBox
      ? document.viewBox
      : WHITEBOARD_VIEWBOX;
  const width = vb.width ?? WHITEBOARD_VIEWBOX.width;
  const height = vb.height ?? WHITEBOARD_VIEWBOX.height;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-full w-full bg-white", className)}
      role="img"
      aria-label="Drawing preview"
    >
      <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
      <ShapeList shapes={shapes} />
    </svg>
  );
}
