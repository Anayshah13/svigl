"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { RedoIcon, UndoIcon } from "./icons";
import type { WhiteboardController } from "./useWhiteboard";

function CopyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  );
}

function PasteIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 4h8v3H8z" strokeLinejoin="round" />
      <rect x="5" y="7" width="14" height="13" rx="1.5" />
    </svg>
  );
}

function DeleteIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M9 7V5h6v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5h6v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function HelpIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ActionButton({
  label,
  shortcut,
  tooltip,
  disabled,
  onClick,
  children,
  destructive,
}: {
  label: string;
  shortcut?: string;
  /** Hover / a11y name when different from visible label (e.g. Clear board). */
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  destructive?: boolean;
}) {
  const tip = tooltip ?? label;
  return (
    <button
      type="button"
      title={shortcut ? `${tip} (${shortcut})` : tip}
      aria-label={shortcut ? `${tip}, ${shortcut}` : tip}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
        "disabled:pointer-events-none disabled:opacity-35",
        destructive
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-white/90 text-ink hover:bg-plum-light/80",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Undo / Redo / Copy / Paste / Delete / Clear — for drawer top bar. */
export function ActionBar({
  controller,
  className,
  onOpenShortcuts,
}: {
  controller: WhiteboardController;
  className?: string;
  onOpenShortcuts?: () => void;
}) {
  const [confirmClear, setConfirmClear] = React.useState(false);

  React.useEffect(() => {
    if (!confirmClear) return;
    const t = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmClear]);

  return (
    <div
      role="toolbar"
      aria-label="Edit actions"
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      <ActionButton
        label="Undo"
        shortcut="Ctrl+Z"
        disabled={!controller.canUndo}
        onClick={controller.undo}
      >
        <UndoIcon />
      </ActionButton>
      <ActionButton
        label="Redo"
        shortcut="Ctrl+Shift+Z"
        disabled={!controller.canRedo}
        onClick={controller.redo}
      >
        <RedoIcon />
      </ActionButton>
      <ActionButton
        label="Copy"
        shortcut="Ctrl+C"
        disabled={!controller.canCopy}
        onClick={controller.copySelected}
      >
        <CopyIcon />
      </ActionButton>
      <ActionButton
        label="Paste"
        shortcut="Ctrl+V"
        disabled={!controller.canPaste}
        onClick={controller.pasteClipboard}
      >
        <PasteIcon />
      </ActionButton>
      <ActionButton
        label="Delete"
        shortcut="Del"
        disabled={!controller.canDelete}
        onClick={controller.deleteSelected}
      >
        <DeleteIcon />
      </ActionButton>
      <ActionButton
        label={confirmClear ? "Confirm?" : "Clear"}
        tooltip={confirmClear ? "Click again to clear the board" : "Clear board"}
        shortcut={confirmClear ? "Click again" : undefined}
        disabled={!controller.canClear}
        destructive={confirmClear}
        onClick={() => {
          if (!confirmClear) {
            setConfirmClear(true);
            return;
          }
          setConfirmClear(false);
          controller.clear();
        }}
      >
        <ClearIcon />
      </ActionButton>
      {onOpenShortcuts ? (
        <ActionButton
          label="Help"
          shortcut="? / Ctrl+/"
          onClick={onOpenShortcuts}
        >
          <HelpIcon />
        </ActionButton>
      ) : null}
    </div>
  );
}
