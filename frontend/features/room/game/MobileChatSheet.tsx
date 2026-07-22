"use client";

import type { ReactNode } from "react";

export function MobileChatSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end lg:hidden">
      <button
        type="button"
        aria-label="Close chat"
        className="absolute inset-0 bg-ink/35"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[55%] min-h-[14rem] overflow-hidden rounded-t-3xl border border-plum/15 bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
}
