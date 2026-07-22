"use client";

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

function ActionButton({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={shortcut ? `${label}, ${shortcut}` : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
        "disabled:pointer-events-none disabled:opacity-35",
        "bg-white/90 text-ink hover:bg-plum-light/80",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Undo / Redo / Copy / Paste / Delete — for drawer top bar. */
export function ActionBar({
  controller,
  className,
}: {
  controller: WhiteboardController;
  className?: string;
}) {
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
    </div>
  );
}
