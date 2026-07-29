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
        "inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-plum-light/80 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 disabled:opacity-50",
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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}>
      <path
        fill="currentColor"
        d="M12.5 3.5a2 2 0 1 1 .7 1.5l-5.1 2.55a2 2 0 0 1 0 1.9l5.1 2.55a2 2 0 1 1-.7 1.5l-5.1-2.55a2 2 0 1 1 0-4.9l5.1-2.55Z"
      />
    </svg>
  );
}

function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}>
      <path
        fill="currentColor"
        d="M4 3.75A1.75 1.75 0 0 1 5.75 2h5.5A1.75 1.75 0 0 1 13 3.75V7h-1.5V3.75a.25.25 0 0 0-.25-.25h-5.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h5.5a.25.25 0 0 0 .25-.25V13H13v3.25A1.75 1.75 0 0 1 11.25 18h-5.5A1.75 1.75 0 0 1 4 16.25V3.75Zm9.22 3.03 2.72 2.72H9.5v1.5h6.44l-2.72 2.72 1.06 1.06L18.56 10l-4.28-4.28-1.06 1.06Z"
      />
    </svg>
  );
}

function useInviteShare(code: string) {
  const [feedback, setFeedback] = useState<"idle" | "ready" | "busy">("idle");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const invite = useCallback(async () => {
    setFeedback("busy");
    const result = await shareRoomInvite(code);
    if (result === "copied" || result === "shared") {
      setFeedback("ready");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setFeedback("idle"), FEEDBACK_MS);
    } else {
      setFeedback("idle");
    }
  }, [code]);

  return { feedback, invite };
}

/** Compact pill to share the invite link. */
export function InviteFriendsPill({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const { feedback, invite } = useInviteShare(code);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn("shrink-0", className)}
      disabled={feedback === "busy"}
      onClick={() => void invite()}
      aria-live="polite"
    >
      {feedback === "ready" ? "Link copied!" : feedback === "busy" ? "Sharing…" : "Invite friends"}
    </Button>
  );
}

/** Icon-only invite control for compact in-game chrome. */
export function InviteFriendsIconButton({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const { feedback, invite } = useInviteShare(code);
  const label =
    feedback === "ready"
      ? "Invite link copied"
      : feedback === "busy"
        ? "Sharing invite"
        : "Invite friends";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={feedback === "busy"}
      onClick={() => void invite()}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-plum/20 bg-plum-light text-plum shadow-sm transition-colors touch-manipulation",
        "hover:bg-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 disabled:opacity-50",
        className,
      )}
    >
      {feedback === "ready" ? (
        <CheckIcon className="h-4 w-4 text-green" />
      ) : (
        <ShareIcon className="h-4 w-4" />
      )}
    </button>
  );
}

/** Icon-only leave control — red to signal exit. */
export function LeaveRoomIconButton({
  onLeave,
  leaving = false,
  className,
}: {
  onLeave: () => void;
  leaving?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={leaving ? "Leaving room" : "Leave room"}
      title={leaving ? "Leaving…" : "Leave room"}
      disabled={leaving}
      onClick={onLeave}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-colors touch-manipulation",
        "hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:opacity-50",
        className,
      )}
    >
      <LeaveIcon className="h-4 w-4" />
    </button>
  );
}
