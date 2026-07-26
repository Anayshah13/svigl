"use client";

import { cn } from "@/lib/cn";

export type ReactionValue = "like" | "dislike" | null;

function ThumbUpIcon({ className }: { className?: string }) {
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
      <path d="M7 11v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3" />
      <path d="M7 11l3.2-6.4A2.2 2.2 0 0 1 12.2 3.5c1.1 0 1.9.9 1.8 2L13.5 11H19a2 2 0 0 1 1.9 2.5l-1.2 5A2.5 2.5 0 0 1 17.3 21H10a3 3 0 0 1-3-3" />
    </svg>
  );
}

function ThumbDownIcon({ className }: { className?: string }) {
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
      <path d="M17 13V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3" />
      <path d="M17 13l-3.2 6.4a2.2 2.2 0 0 1-2 1.1c-1.1 0-1.9-.9-1.8-2L11.5 13H5a2 2 0 0 1-1.9-2.5l1.2-5A2.5 2.5 0 0 1 6.7 3H14a3 3 0 0 1 3 3" />
    </svg>
  );
}

export function ReactionBar({
  likes,
  dislikes,
  myReaction,
  disabled = false,
  onReact,
  className,
  size = "md",
}: {
  likes: number;
  dislikes: number;
  myReaction: ReactionValue;
  disabled?: boolean;
  onReact?: (next: ReactionValue) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const toggle = (value: "like" | "dislike") => {
    if (disabled || !onReact) return;
    onReact(myReaction === value ? null : value);
  };

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const pad = size === "sm" ? "p-1" : "p-1.5";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-plum/15 bg-white/95 shadow-sm backdrop-blur-sm",
        pad,
        className,
      )}
      role="group"
      aria-label="Drawing reactions"
    >
      <button
        type="button"
        disabled={disabled || !onReact}
        onClick={() => toggle("like")}
        aria-pressed={myReaction === "like"}
        aria-label={`Like${likes ? `, ${likes}` : ""}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40",
          myReaction === "like"
            ? "bg-green text-white shadow-sm"
            : "text-ink-muted hover:bg-green-light hover:text-green",
          (disabled || !onReact) && "cursor-default opacity-80 hover:bg-transparent hover:text-ink-muted",
        )}
      >
        <ThumbUpIcon className={iconClass} />
        <span>{likes}</span>
      </button>
      <button
        type="button"
        disabled={disabled || !onReact}
        onClick={() => toggle("dislike")}
        aria-pressed={myReaction === "dislike"}
        aria-label={`Dislike${dislikes ? `, ${dislikes}` : ""}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/40",
          myReaction === "dislike"
            ? "bg-pink text-white shadow-sm"
            : "text-ink-muted hover:bg-pink-light hover:text-pink",
          (disabled || !onReact) && "cursor-default opacity-80 hover:bg-transparent hover:text-ink-muted",
        )}
      >
        <ThumbDownIcon className={iconClass} />
        <span>{dislikes}</span>
      </button>
    </div>
  );
}
