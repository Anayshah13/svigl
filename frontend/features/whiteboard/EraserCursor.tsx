"use client";

import * as React from "react";

type EraserCursorProps = {
  visible: boolean;
};

/**
 * Small eraser tip overlay. Position is applied via the forwarded ref
 * (DOM transform) so pointer tracking does not re-render the whiteboard tree.
 */
export const EraserCursor = React.forwardRef<HTMLDivElement, EraserCursorProps>(
  function EraserCursor({ visible }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20 will-change-transform"
        style={{
          display: visible ? "block" : "none",
          transform: "translate(-9999px, -9999px)",
        }}
      >
        <div
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400"
        />
      </div>
    );
  },
);
