import { cn } from "@/lib/cn";
import { ACCENT_BG_SOFT, ACCENT_TEXT } from "../accents";
import type { LabConfig } from "../types";
import { LabIcon } from "./LabIcon";

/** Polished canvas stand-in until lab gameplay is wired up. */
export function LabCanvasPlaceholder({
  lab,
  className,
}: {
  lab: LabConfig;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dot-grid relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-200/80 bg-white sm:aspect-[16/10]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40" />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-3xl",
            ACCENT_BG_SOFT[lab.accent],
            ACCENT_TEXT[lab.accent],
          )}
        >
          <LabIcon id={lab.icon} className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Challenge canvas</p>
          <p className="mt-1 max-w-xs text-xs text-ink-muted">
            Drawing surface coming soon — architecture is ready for gameplay.
          </p>
        </div>
      </div>
    </div>
  );
}
