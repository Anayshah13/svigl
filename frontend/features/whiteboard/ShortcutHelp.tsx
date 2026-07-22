"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { TOOL_META } from "./toolMeta";

const GENERAL_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Y / Ctrl+Shift+Z", action: "Redo" },
  { keys: "Ctrl+C", action: "Copy selection" },
  { keys: "Ctrl+V", action: "Paste" },
  { keys: "Ctrl+D", action: "Duplicate" },
  { keys: "Del / Backspace", action: "Delete selection" },
  { keys: "Clear (toolbar)", action: "Clear board — click twice to confirm" },
  { keys: "Arrow keys", action: "Nudge selection (Shift = larger)" },
  { keys: "Esc", action: "Cancel draft / deselect / close this help" },
  { keys: "Enter", action: "Commit curve draft" },
  { keys: "Space + drag", action: "Pan canvas" },
  { keys: "Ctrl + scroll", action: "Zoom toward cursor" },
  { keys: "Pinch (touch)", action: "Zoom · two-finger drag pans" },
  { keys: "+ / −", action: "Zoom in / out (on-screen controls)" },
  { keys: "Double-click empty", action: "Zoom to fit" },
  { keys: "Shift (while drawing)", action: "Constrain (square / circle)" },
  { keys: "Alt (while drawing)", action: "Skew rect / rotate ellipse" },
  { keys: "? or Ctrl+/", action: "Toggle this cheat sheet" },
];

export function ShortcutHelp({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex items-center justify-center p-3",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Dismiss shortcuts help"
        className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        className="relative z-10 max-h-[min(32rem,85%)] w-full max-w-lg overflow-y-auto rounded-2xl border border-plum/20 bg-white p-4 shadow-xl focus:outline-none sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-plum">
              Shortcuts
            </p>
            <h2 className="text-base font-semibold text-ink">
              Mid-game cheat sheet
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl text-sm font-semibold text-ink-muted hover:bg-plum-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            aria-label="Close shortcuts help"
          >
            Esc
          </button>
        </div>

        <section className="mb-4">
          <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Tools
          </h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {TOOL_META.map((t) => (
              <li
                key={t.id}
                className="flex items-baseline justify-between gap-2 rounded-lg bg-plum-light/35 px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium text-ink">{t.label}</span>
                <kbd className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink-muted shadow-sm">
                  {t.shortcut}
                  {t.id === "select"
                    ? " / V"
                    : t.id === "eraser"
                      ? " / E / X"
                      : t.id === "hand"
                        ? " / H"
                        : ""}
                </kbd>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Editing & view
          </h3>
          <ul className="grid gap-1">
            {GENERAL_SHORTCUTS.map((row) => (
              <li
                key={row.keys}
                className="flex items-baseline justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs odd:bg-black/[0.03]"
              >
                <span className="text-ink">{row.action}</span>
                <kbd className="shrink-0 rounded border border-plum/15 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                  {row.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
