"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { WhiteboardController } from "./useWhiteboard";

export interface ContextMenuState {
  x: number;
  y: number;
  /** True when opened over empty canvas (paste still available). */
  hasSelection: boolean;
}

export function ContextMenu({
  state,
  controller,
  onClose,
  onOpenProperties,
}: {
  state: ContextMenuState | null;
  controller: WhiteboardController;
  onClose: () => void;
  onOpenProperties?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [state, onClose]);

  if (!state) return null;

  const items: {
    label: string;
    disabled?: boolean;
    action: () => void;
  }[] = [
    {
      label: "Copy",
      disabled: !controller.canCopy,
      action: () => {
        controller.copySelected();
        onClose();
      },
    },
    {
      label: "Paste",
      disabled: !controller.canPaste,
      action: () => {
        controller.pasteClipboard();
        onClose();
      },
    },
    {
      label: "Duplicate",
      disabled: !controller.canDuplicate,
      action: () => {
        controller.duplicateSelected();
        onClose();
      },
    },
    {
      label: "Delete",
      disabled: !controller.canDelete,
      action: () => {
        controller.deleteSelected();
        onClose();
      },
    },
    {
      label: "Bring forward",
      disabled: !controller.canBringForward,
      action: () => {
        controller.bringForward();
        onClose();
      },
    },
    {
      label: "Send backward",
      disabled: !controller.canSendBackward,
      action: () => {
        controller.sendBackward();
        onClose();
      },
    },
    {
      label: "Properties",
      disabled: !state.hasSelection,
      action: () => {
        onOpenProperties?.();
        onClose();
      },
    },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Shape actions"
      className="fixed z-50 min-w-[11rem] rounded-xl border border-plum/20 bg-white py-1 shadow-lg"
      style={{ left: state.x, top: state.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={item.action}
          className={cn(
            "flex min-h-11 w-full items-center px-3 text-left text-sm font-medium text-ink",
            "hover:bg-plum-light/70 focus-visible:bg-plum-light/70 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-35",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
