"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copyRoomCode, shareRoomInvite } from "@/lib/room-invite";
import { cn } from "@/lib/cn";

const FEEDBACK_MS = 2000;

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}>
      <path
        fill="currentColor"
        d="M6 2a2 2 0 0 0-2 2v10h1V4h9V2H6Zm2 3a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5Zm2 0v10h7V5h-7Z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}>
      <path
        fill="currentColor"
        d="M7.5 13.2 4.8 10.5l-1.1 1.1L7.5 15.4l9.2-9.2-1.1-1.1-8.1 8.1Z"
      />
    </svg>
  );
}

/** Tiny copy control anchored to the bottom-right of the room code. */
export function RoomCodeCopyButton({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    setBusy(true);
    const ok = await copyRoomCode(code);
    setBusy(false);
    if (!ok) return;

    setCopied(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
  }, [code]);

  return (
    <button
      type="button"
      aria-label={copied ? "Room code copied" : "Copy room code"}
      disabled={busy}
      onClick={() => void handleCopy()}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-plum-light/80 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 disabled:opacity-50",
        className,
      )}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-green" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </button>
  );
}

/** Compact pill to share the invite link. */
export function InviteFriendsPill({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [feedback, setFeedback] = useState<"idle" | "ready" | "busy">("idle");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleInvite = async () => {
    setFeedback("busy");
    const result = await shareRoomInvite(code);
    if (result === "copied" || result === "shared") {
      setFeedback("ready");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setFeedback("idle"), FEEDBACK_MS);
    } else {
      setFeedback("idle");
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn("shrink-0", className)}
      disabled={feedback === "busy"}
      onClick={() => void handleInvite()}
      aria-live="polite"
    >
      {feedback === "ready" ? "Link copied!" : feedback === "busy" ? "Sharing…" : "Invite friends"}
    </Button>
  );
}
