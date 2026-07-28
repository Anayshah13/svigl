"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Local countdown from the server deadline. TIMER_UPDATED / snapshots correct
 * skew; the UI keeps ticking even if a tick is dropped.
 *
 * Only commits React state when the displayed whole-second value changes.
 */
export function usePhaseCountdown(
  phaseEndsAt: string | null | undefined,
  serverTime: string | null | undefined,
  remainingSeconds: number | null | undefined,
): number | null {
  const [seconds, setSeconds] = useState<number | null>(
    remainingSeconds ?? null,
  );
  const skewMsRef = useRef(0);

  useEffect(() => {
    if (typeof serverTime === "string") {
      const parsed = Date.parse(serverTime);
      if (!Number.isNaN(parsed)) {
        skewMsRef.current = Date.now() - parsed;
      }
    }
    if (typeof remainingSeconds === "number" && Number.isFinite(remainingSeconds)) {
      setSeconds(Math.max(0, Math.ceil(remainingSeconds)));
    }
  }, [phaseEndsAt, serverTime, remainingSeconds]);

  useEffect(() => {
    if (!phaseEndsAt) {
      return;
    }
    const endMs = Date.parse(phaseEndsAt);
    if (Number.isNaN(endMs)) {
      return;
    }

    let intervalId: number | undefined;

    const tick = () => {
      const now = Date.now() - skewMsRef.current;
      const next = Math.max(0, Math.ceil((endMs - now) / 1000));
      setSeconds((prev) => (prev === next ? prev : next));
    };

    tick();
    const msIntoSecond = (Date.now() - skewMsRef.current) % 1000;
    const alignId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 1000);
    }, Math.max(0, 1000 - msIntoSecond));

    return () => {
      window.clearTimeout(alignId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [phaseEndsAt]);

  if (phaseEndsAt) {
    return seconds;
  }
  return typeof remainingSeconds === "number" ? remainingSeconds : seconds;
}
