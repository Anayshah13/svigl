"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  evaluateLabStroke,
  LAB_CANVAS_CENTER,
  LAB_CANVAS_HEIGHT,
  LAB_CANVAS_WIDTH,
  type LabGameId,
  type LabScoreResult,
  type TimedPoint,
} from "@/lib/labs";
import type { LabConfig } from "../types";

const CX = LAB_CANVAS_CENTER.x;
const CY = LAB_CANVAS_CENTER.y;

/** Faint target silhouette so the idle board reads as “draw this around the mark”. */
function IdleGhost({ slug }: { slug: string }) {
  const common = {
    fill: "none" as const,
    stroke: "var(--plum)",
    strokeWidth: 1.75,
    strokeDasharray: "6 7",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    opacity: 0.22,
  };

  if (slug === "perfect-circle") {
    return <circle cx={CX} cy={CY} r={88} {...common} />;
  }

  if (slug === "perfect-square") {
    const s = 150;
    return (
      <rect
        x={CX - s / 2}
        y={CY - s / 2}
        width={s}
        height={s}
        rx={2}
        {...common}
      />
    );
  }

  if (slug === "perfect-triangle") {
    const r = 95;
    const verts = [0, 1, 2].map((k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
      return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
    });
    return <polygon points={verts.join(" ")} {...common} />;
  }

  if (slug === "infinity-loop") {
    // Compact lemniscate of Bernoulli around the origin
    const scale = 110;
    const parts: string[] = [];
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const t = (2 * Math.PI * i) / n;
      const s = Math.sin(t);
      const c = Math.cos(t);
      const denom = 1 + s * s;
      const x = CX + (scale * Math.SQRT2 * c) / denom;
      const y = CY + (scale * Math.SQRT2 * c * s) / denom;
      parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return <path d={`${parts.join(" ")} Z`} {...common} />;
  }

  return null;
}

function idleHint(slug: string): string {
  if (slug === "infinity-loop") {
    return "Trace the figure-eight · cross at the origin";
  }
  return "Draw around the center mark · one continuous stroke";
}

export function LabChallengeCanvas({
  lab,
  onScored,
  fillHeight = false,
}: {
  lab: LabConfig;
  onScored?: (result: LabScoreResult) => void | Promise<void>;
  /** When true, canvas grows to fill available height (mobile play shell). */
  fillHeight?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<TimedPoint[]>([]);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  const [pathD, setPathD] = useState("");

  const showAxes = lab.slug === "infinity-loop";

  useEffect(() => {
    pointsRef.current = [];
    drawingRef.current = false;
    activePointerIdRef.current = null;
    setPathD("");
  }, [lab.slug]);

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
      setPathD("");
      pointsRef.current = [];
      return;
    }
    const scored = evaluateLabStroke(lab.slug as LabGameId, pts);
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
    setPathD("");
  };

  const idle = !pathD;

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft) overscroll-contain",
        fillHeight
          ? "min-h-44 max-h-[min(52vh,440px)] flex-1 lg:aspect-video lg:max-h-[min(54vh,460px)] lg:flex-none"
          : "aspect-16/11 max-h-[min(52vh,440px)] sm:aspect-video sm:max-h-[min(54vh,460px)]",
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LAB_CANVAS_WIDTH} ${LAB_CANVAS_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="dot-grid block h-full w-full touch-none select-none cursor-crosshair bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g pointerEvents="none" aria-hidden="true">
          {showAxes ? (
            <>
              <line
                x1={0}
                y1={CY}
                x2={LAB_CANVAS_WIDTH}
                y2={CY}
                stroke="var(--ink-muted, #94a3b8)"
                strokeWidth="1.25"
                strokeDasharray="5 6"
                opacity="0.7"
              />
              <line
                x1={CX}
                y1={0}
                x2={CX}
                y2={LAB_CANVAS_HEIGHT}
                stroke="var(--ink-muted, #94a3b8)"
                strokeWidth="1.25"
                strokeDasharray="5 6"
                opacity="0.7"
              />
            </>
          ) : null}
          <circle cx={CX} cy={CY} r="4.5" fill="var(--plum)" opacity="0.9" />
          <circle
            cx={CX}
            cy={CY}
            r="10"
            fill="none"
            stroke="var(--plum)"
            strokeWidth="1"
            opacity="0.28"
          />
        </g>

        <g
          pointerEvents="none"
          opacity={idle ? 1 : 0}
          style={{ transition: "opacity 120ms linear" }}
          aria-hidden="true"
        >
          <IdleGhost slug={lab.slug} />
          <text
            x={CX}
            y={LAB_CANVAS_HEIGHT - 36}
            textAnchor="middle"
            fill="var(--ink-muted)"
            fontSize="13"
            fontFamily="var(--font-sans, system-ui, sans-serif)"
          >
            {idleHint(lab.slug)}
          </text>
        </g>

        {pathD ? (
          <path
            d={pathD}
            fill="none"
            stroke="var(--plum)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>

      <Button
        variant="outline"
        size="sm"
        onClick={reset}
        className="absolute bottom-3 right-3 z-10 min-h-9 touch-manipulation bg-white/95 shadow-sm backdrop-blur-sm"
      >
        Try again
      </Button>
    </div>
  );
}
