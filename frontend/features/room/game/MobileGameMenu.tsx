"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

function GearIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

interface MenuAction {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  icon?: React.ReactNode;
}

/**
 * Compact settings button + dropdown menu for the mobile game view.
 * Sits in the mobile top bar where the desktop shows the action bar.
 */
export function MobileGameMenu({
  actions,
  className,
  label = "Game menu",
}: {
  actions: MenuAction[];
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target || !containerRef.current) return;
      if (!containerRef.current.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl border border-plum/20 bg-white/95 text-ink shadow-sm",
          "hover:bg-plum-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
          open && "border-plum bg-plum-light/60",
        )}
      >
        <GearIcon />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-plum/15 bg-white shadow-lg"
        >
          <ul className="py-1">
            {actions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    action.tone === "danger"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-ink hover:bg-plum-light/60",
                  )}
                >
                  {action.icon ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center text-ink-muted">
                      {action.icon}
                    </span>
                  ) : null}
                  <span className="flex-1">{action.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
