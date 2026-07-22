"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import type { ChatMessage } from "@/types/room";

/**
 * Lift the chat form above the mobile virtual keyboard using visualViewport.
 * Returns pixels of keyboard overlap at the bottom of the layout viewport.
 */
function useKeyboardBottomInset(active: boolean): number {
  const [inset, setInset] = React.useState(0);

  React.useEffect(() => {
    if (!active) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // How much of the layout viewport is covered by the keyboard / browser chrome
      const covered = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      setInset(covered);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);

  return active ? inset : 0;
}

export function ChatPanel({
  messages,
  canSendChat,
  disabledReason,
  inputHint,
  onSend,
  className,
  placeholder = "Type your guess here...",
}: {
  messages: ChatMessage[];
  canSendChat: boolean;
  disabledReason?: string;
  /** Contextual note when the input is enabled (waiting / private chat). */
  inputHint?: string;
  onSend: (text: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const [inputFocused, setInputFocused] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardBottomInset(inputFocused);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canSendChat) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-plum/15 bg-white/90 sm:rounded-3xl",
        className,
      )}
      style={
        keyboardInset > 0
          ? { transform: `translateY(-${keyboardInset}px)` }
          : undefined
      }
    >
      <div className="shrink-0 border-b border-plum/10 px-3 py-2 sm:px-4 sm:py-3">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-ink-muted sm:text-xs">
          Chat
        </h2>
      </div>

      {/* Fixed flex child: messages scroll internally, never grow the page */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-2 sm:space-y-1.5 sm:px-3 sm:py-3"
      >
        {messages.length === 0 ? (
          <p className="px-1 text-xs text-ink-muted sm:text-sm">
            Guesses and chat appear here.
          </p>
        ) : (
          messages.map((msg) => {
            const isSystem =
              msg.kind === "system" ||
              msg.kind === "correct_guess" ||
              msg.kind === "close_guess";
            const isPrivate = msg.kind === "private_chat";
            return (
              <p
                key={msg.id}
                className={cn(
                  "rounded-xl px-2 py-1 text-xs sm:px-2.5 sm:py-1.5 sm:text-sm",
                  msg.kind === "correct_guess"
                    ? "bg-green-light font-semibold text-green"
                    : msg.kind === "close_guess"
                      ? "bg-green-light/70 font-medium text-green"
                      : isPrivate
                        ? "bg-green-light/50 text-ink"
                        : isSystem
                          ? "bg-plum-light/50 font-medium text-plum"
                          : "text-ink",
                )}
              >
                {isPrivate ? (
                  <span className="mr-1.5 inline-flex align-middle text-[10px] font-bold uppercase tracking-wide text-green sm:text-[11px]">
                    Private
                  </span>
                ) : null}
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

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-plum/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:p-3 sm:pb-3"
      >
        <div className="flex gap-1.5 sm:gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              canSendChat ? placeholder : disabledReason ?? "Chat disabled"
            }
            disabled={!canSendChat}
            maxLength={200}
            autoComplete="off"
            enterKeyHint="send"
            aria-label="Guess or chat message"
            aria-describedby={
              !canSendChat && disabledReason
                ? "chat-disabled-reason"
                : canSendChat && inputHint
                  ? "chat-input-hint"
                  : undefined
            }
            className="min-h-10 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!canSendChat || !draft.trim()}
            className="min-h-10 shrink-0 touch-manipulation px-3"
          >
            Send
          </Button>
        </div>
        {!canSendChat && disabledReason ? (
          <p
            id="chat-disabled-reason"
            className="mt-1.5 hidden text-xs text-ink-muted sm:mt-2 sm:block"
          >
            {disabledReason}
          </p>
        ) : null}
        {canSendChat && inputHint ? (
          <p
            id="chat-input-hint"
            className="mt-1.5 hidden text-xs text-ink-muted sm:mt-2 sm:block"
          >
            {inputHint}
          </p>
        ) : null}
      </form>
    </div>
  );
}
