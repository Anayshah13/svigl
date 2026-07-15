"use client";

/**
 * Local playground for the SVG whiteboard.
 * Game screens should import `@/features/whiteboard` instead of this route.
 */

import { Whiteboard } from "@/features/whiteboard";

export default function WhiteboardDemoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f5eef8_0%,_#fafaf8_55%,_#eef6f1_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Whiteboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Curve · Rect (Shift=square, Alt=skew) · Ellipse (Shift=circle, Alt=rotate) ·
            Arrow · Fill. Drawer-only interaction demo.
          </p>
        </header>
        <Whiteboard isDrawer playerId="demo" className="rounded-3xl" />
      </div>
    </main>
  );
}
