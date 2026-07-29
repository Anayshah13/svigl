"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  evaluateLabStroke,
  type LabGameId,
  type LabScoreResult,
  type TimedPoint,
} from "@/lib/labs";
import { ACCENT_BG_SOFT, ACCENT_TEXT } from "../accents";
import type { LabConfig } from "../types";
import { LabIcon } from "./LabIcon";
import { ScoreBreakdown } from "./ScoreBreakdown";

type Phase = "idle" | "drawing" | "scored";

export function LabChallengeCanvas({
  lab,
  onScored,
  fillHeight = false,
}: {
  lab: LabConfig;
  onScored?: (result: LabScoreResult) => void | Promise<void>;
  /** When true, canvas grows to fill the play shell instead of a fixed aspect ratio. */
  fillHeight?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<TimedPoint[]>([]);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [pathD, setPathD] = useState("");
  const [result, setResult] = useState<LabScoreResult | null>(null);

  useEffect(() => {
    pointsRef.current = [];
    drawingRef.current = false;
    activePointerIdRef.current = null;
    setPhase("idle");
    setPathD("");
    setResult(null);
  }, [lab.slug]);

  useEffect(() => {
    const root = document.documentElement;
    if (phase === "drawing") {
      root.classList.add("lab-drawing");
    } else {
      root.classList.remove("lab-drawing");
    }
    return () => {
      root.classList.remove("lab-drawing");
    };
  }, [phase]);

  const clientToLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const rebuildPath = (pts: TimedPoint[]) => {
    if (pts.length === 0) {
      setPathD("");
      return;
    }
    let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i]!.x.toFixed(2)} ${pts[i]!.y.toFixed(2)}`;
    }
    setPathD(d);
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    activePointerIdRef.current = null;
    const pts = pointsRef.current;
    if (pts.length < 8) {
      setPhase("idle");
      setPathD("");
      pointsRef.current = [];
      return;
    }
    const scored = evaluateLabStroke(lab.slug as LabGameId, pts);
    setResult(scored);
    setPhase("scored");
    void Promise.resolve(onScored?.(scored));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (activePointerIdRef.current != null) return;
    const local = clientToLocal(e.clientX, e.clientY);
    if (!local) return;
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setPhase("drawing");
    setResult(null);
    const next = [{ x: local.x, y: local.y, t: e.timeStamp }];
    pointsRef.current = next;
    rebuildPath(next);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!drawingRef.current || e.pointerId !== activePointerIdRef.current) return;
    const local = clientToLocal(e.clientX, e.clientY);
    if (!local) return;
    const pts = pointsRef.current;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(local.x - last.x, local.y - last.y) < 1.25) return;
    pts.push({ x: local.x, y: local.y, t: e.timeStamp });
    rebuildPath(pts);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (e.pointerId !== activePointerIdRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    finishStroke();
  };

  const reset = () => {
    pointsRef.current = [];
    drawingRef.current = false;
    activePointerIdRef.current = null;
    setPhase("idle");
    setPathD("");
    setResult(null);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:gap-4",
        fillHeight && "min-h-0 flex-1 lg:flex-none",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft) overscroll-contain",
          fillHeight
            ? "min-h-48 flex-1 lg:aspect-16/10 lg:flex-none lg:min-h-0"
            : "aspect-4/3 sm:aspect-16/10",
        )}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 640 400"
          preserveAspectRatio="xMidYMid meet"
          className="dot-grid block h-full w-full touch-none select-none cursor-crosshair bg-white"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {pathD ? (
            <path
              d={pathD}
              fill="none"
              stroke="var(--plum)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <g pointerEvents="none">
              <foreignObject x="0" y="0" width="640" height="400">
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-3xl",
                      ACCENT_BG_SOFT[lab.accent],
                      ACCENT_TEXT[lab.accent],
                    )}
                  >
                    <LabIcon id={lab.icon} className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold text-ink">Draw in one stroke</p>
                  <p className="max-w-xs text-xs text-ink-muted">
                    Drag with one finger to draw {lab.name.toLowerCase()}. Release to
                    score.
                  </p>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>

        {phase === "drawing" ? (
          <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-plum shadow-sm">
            Drawing…
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] z-10 -mx-1 flex flex-wrap items-center gap-2 bg-white/95 px-1 py-2 backdrop-blur-sm supports-backdrop-filter:bg-white/85 lg:static lg:bottom-auto lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="min-h-11 touch-manipulation sm:min-h-9"
        >
          Try again
        </Button>
        {phase === "idle" ? (
          <p className="text-xs text-ink-muted">
            One continuous stroke. Scoring runs on release.
          </p>
        ) : null}
      </div>

      {result ? (
        <div
          className={cn(
            fillHeight &&
              "max-h-[40%] overflow-y-auto overscroll-contain lg:max-h-none lg:overflow-visible",
          )}
        >
          <ScoreBreakdown result={result} compact={fillHeight} />
        </div>
      ) : null}
    </div>
  );
}
