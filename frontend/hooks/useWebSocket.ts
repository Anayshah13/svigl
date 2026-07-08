"use client";

/**
 * @deprecated Unused in production — use appWebSocket instead.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { WebSocketService } from "@/services/websocket";
import type { ConnectionState, WSEventType } from "@/types/room";

interface UseWebSocketOptions {
  roomCode: string | null;
  enabled?: boolean;
  onEvent?: (type: WSEventType, payload: Record<string, unknown>) => void;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  send: (type: WSEventType, payload?: Record<string, unknown>) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket({
  roomCode,
  enabled = true,
  onEvent,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocketService | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !roomCode) {
      wsRef.current?.disconnect();
      wsRef.current = null;
      setConnectionState("disconnected");
      return;
    }

    const service = new WebSocketService({
      roomCode,
      onStateChange: setConnectionState,
      onEvent: (type, payload) => onEventRef.current?.(type, payload),
    });

    wsRef.current = service;
    service.connect();

    return () => {
      service.disconnect();
      wsRef.current = null;
    };
  }, [roomCode, enabled]);

  const send = useCallback((type: WSEventType, payload: Record<string, unknown> = {}) => {
    wsRef.current?.send(type, payload);
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current?.connect();
  }, []);

  return { connectionState, send, disconnect, reconnect };
}
