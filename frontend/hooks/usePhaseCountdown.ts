"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Local countdown from the server deadline. TIMER_UPDATED / snapshots correct
 * skew; the UI keeps ticking even if a tick is dropped.
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

    const tick = () => {
      const now = Date.now() - skewMsRef.current;
      setSeconds(Math.max(0, Math.ceil((endMs - now) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phaseEndsAt]);

  if (phaseEndsAt) {
    return seconds;
  }
  return typeof remainingSeconds === "number" ? remainingSeconds : seconds;
}
