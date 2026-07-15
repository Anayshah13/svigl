"use client";

import { useEffect, useState } from "react";
import { appWebSocket } from "@/services/app-websocket";
import type { ChatMessage } from "@/types/room";

const MAX_MESSAGES = 200;

/** Accumulates CHAT_MESSAGE events for the active room tab. */
export function useGameChat(roomCode: string | undefined, sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setMessages([]);
  }, [roomCode, sessionId]);

  useEffect(() => {
    return appWebSocket.subscribeChat((message) => {
      setMessages((prev) => {
        const next = [...prev, message];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    });
  }, []);

  return messages;
}
