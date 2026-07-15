"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import type { ChatMessage } from "@/types/room";

export function ChatPanel({
  messages,
  canGuess,
  disabledReason,
  onSend,
  className,
  placeholder = "Type your guess here...",
}: {
  messages: ChatMessage[];
  canGuess: boolean;
  disabledReason?: string;
  onSend: (text: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canGuess) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-[16rem] flex-col overflow-hidden rounded-3xl border border-plum/15 bg-white/90 lg:min-h-0",
        className,
      )}
    >
      <div className="border-b border-plum/10 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          Chat
        </h2>
      </div>

      <div ref={listRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted">Guesses and chat appear here.</p>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.kind === "system" || msg.kind === "correct_guess";
            return (
              <p
                key={msg.id}
                className={cn(
                  "rounded-xl px-2.5 py-1.5 text-sm",
                  msg.kind === "correct_guess"
                    ? "bg-green-light font-semibold text-green"
                    : isSystem
                      ? "bg-plum-light/50 font-medium text-plum"
                      : "text-ink",
                )}
              >
                {!isSystem && msg.playerName ? (
                  <span className="font-semibold text-plum">
                    {formatDisplayName(msg.playerName)}:{" "}
                  </span>
                ) : null}
                {msg.message}
              </p>
            );
          })
        )}
      </div>

      <form onSubmit={submit} className="border-t border-plum/10 p-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder={canGuess ? placeholder : disabledReason ?? "Chat disabled"}
            disabled={!canGuess}
            maxLength={200}
            autoComplete="off"
            aria-label="Guess or chat message"
          />
          <Button type="submit" size="sm" disabled={!canGuess || !draft.trim()}>
            Send
          </Button>
        </div>
        {!canGuess && disabledReason ? (
          <p className="mt-2 text-xs text-ink-muted">{disabledReason}</p>
        ) : null}
      </form>
    </div>
  );
}
