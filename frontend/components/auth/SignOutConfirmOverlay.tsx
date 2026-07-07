"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ROOM_STATUS_LABELS } from "@/types/room";
import type { RoomStatus } from "@/types/room";

interface SignOutConfirmOverlayProps {
  open: boolean;
  busy: boolean;
  roomCode?: string | null;
  roomStatus?: RoomStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function getConsequences(roomCode?: string | null, roomStatus?: RoomStatus | null): string[] {
  const items = ["You'll be signed out of your account."];

  if (roomCode) {
    const statusLabel = roomStatus ? ROOM_STATUS_LABELS[roomStatus].toLowerCase() : "active";
    items.push(
      `You'll be removed from room ${roomCode} (${statusLabel}).`,
    );
  }

  items.push("You'll need to sign in again to continue.");

  return items;
}

export function SignOutConfirmOverlay({
  open,
  busy,
  roomCode,
  roomStatus,
  onConfirm,
  onCancel,
}: SignOutConfirmOverlayProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onCancel, open]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const consequences = getConsequences(roomCode, roomStatus);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sign-out-title"
          aria-describedby="sign-out-description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm rounded-2xl border border-plum/15 bg-white p-6 shadow-xl sm:rounded-3xl sm:p-8"
          >
            <h2 id="sign-out-title" className="text-lg font-bold text-ink sm:text-xl">
              Sign out?
            </h2>

            <div id="sign-out-description" className="mt-3">
              <p className="text-sm text-ink-muted">This will:</p>
              <ul className="mt-2 space-y-1.5">
                {consequences.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-plum/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={busy}
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="md"
                disabled={busy}
                onClick={onConfirm}
                className="flex-1 bg-red-600 text-white shadow-md hover:bg-red-700"
              >
                {busy ? "Signing out…" : "Confirm sign out"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
