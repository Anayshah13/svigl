"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Centers a square board that fills as much of the parent as possible
 * (min of available width and height) — same shape on phone, tablet, laptop.
 */
export function SquareBoard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [side, setSide] = React.useState(0);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const { width, height } = host.getBoundingClientRect();
      const next = Math.floor(Math.max(0, Math.min(width, height)));
      setSide((prev) => (prev === next ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 items-center justify-center",
        className,
      )}
    >
      <div
        className="relative shrink-0 overflow-hidden"
        style={
          side > 0
            ? { width: side, height: side }
            : { width: "100%", aspectRatio: "1 / 1", maxHeight: "100%" }
        }
      >
        {children}
      </div>
    </div>
  );
}
