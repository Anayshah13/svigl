/**
 * @deprecated Unused in production — RoomPresenceKeeper + appWebSocket own the tab socket.
 * Creates a per-room WebSocket to /ws/{code}; do not use alongside appWebSocket.
 */

import { getApiUrl } from "@/lib/api";
import type { ConnectionState, WSEventType, WSMessage } from "@/types/room";

export type WSEventHandler = (payload: Record<string, unknown>) => void;

interface WebSocketServiceOptions {
  roomCode: string;
  onStateChange: (state: ConnectionState) => void;
  onEvent: (type: WSEventType, payload: Record<string, unknown>) => void;
  heartbeatIntervalMs?: number;
  reconnectBaseDelayMs?: number;
  maxReconnectAttempts?: number;
}

const DEFAULT_HEARTBEAT_MS = 10_000;
const DEFAULT_RECONNECT_BASE_MS = 1_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private state: ConnectionState = "disconnected";

  private readonly roomCode: string;
  private readonly onStateChange: (state: ConnectionState) => void;
  private readonly onEvent: (type: WSEventType, payload: Record<string, unknown>) => void;
  private readonly heartbeatIntervalMs: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly maxReconnectAttempts: number;

  constructor(options: WebSocketServiceOptions) {
    this.roomCode = options.roomCode;
    this.onStateChange = options.onStateChange;
    this.onEvent = options.onEvent;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_MS;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.intentionalClose = false;
    this.setState("connecting");

    const apiUrl = getApiUrl();
    const wsUrl = apiUrl.replace(/^http/, "ws") + `/ws/${this.roomCode}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState("connected");
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type && msg.payload !== undefined) {
          this.onEvent(msg.type, msg.payload);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();

      if (this.intentionalClose) {
        this.setState("disconnected");
        return;
      }

      // 4003 = auth failed, 4004 = not a member — don't reconnect
      if (event.code === 4003 || event.code === 4004) {
        this.setState("error");
        this.onEvent("ERROR", {
          detail: event.reason || "Connection rejected",
          code: event.code,
        });
        return;
      }

      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this, which handles reconnection
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.setState("disconnected");
  }

  send(type: WSEventType, payload: Record<string, unknown> = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange(newState);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send("PING");
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState("error");
      return;
    }

    this.setState("reconnecting");
    this.reconnectAttempts++;

    const delay = Math.min(
      this.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1),
      30_000,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
