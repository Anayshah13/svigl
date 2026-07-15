/**
 * Application WebSocket — one authenticated connection per browser tab.
 *
 * Room membership changes via JOIN_ROOM / LEAVE_ROOM events on the same socket.
 * REST is still responsible for create/join/leave; this layer only syncs.
 */

import { getWsUrl } from "@/lib/api";
import { mapRoomPayload } from "@/lib/room-payload";
import { nextSocketId, wsDebug } from "@/lib/ws-debug";
import type {
  ChatMessage,
  GameSettings,
  Room,
  RoomError,
  WSEventType,
  WSMessage,
} from "@/types/room";

type RoomUpdateHandler = (room: Room) => void;
type RoomErrorHandler = (error: RoomError) => void;
type ChatHandler = (message: ChatMessage) => void;
type CanvasEventHandler = (type: WSEventType, payload: Record<string, unknown>) => void;

const ROOM_SYNC_EVENTS: WSEventType[] = [
  "ROOM_UPDATED",
  "PLAYER_JOINED",
  "PLAYER_LEFT",
  "PLAYER_READY",
  "PLAYER_UNREADY",
  "GAME_STARTED",
  "COUNTDOWN_STARTED",
  "WORD_CHOICES_OFFERED",
  "WORD_SELECTED",
  "ROUND_STARTED",
  "ROUND_ENDED",
  "GAME_FINISHED",
  "PLAYER_WAITING",
  "GAME_STATE_UPDATED",
  "HOST_CHANGED",
  "PLAYER_GUESSED",
  "SCORES_UPDATED",
];

const CANVAS_EVENTS: WSEventType[] = [
  "CANVAS_CLEAR",
  "CANVAS_CLEARED",
  "CANVAS_SNAPSHOT_REQUEST",
  "CANVAS_SNAPSHOT",
  "SHAPE_CREATED",
  "SHAPE_UPDATED",
  "SHAPE_DELETED",
  "UNDO",
  "REDO",
];

class AppWebSocketManager {
  private socket: WebSocket | null = null;
  private socketId: string | null = null;
  private userId: string | null = null;
  private joinedRoomCode: string | null = null;
  private pendingJoinCode: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private readonly maxReconnects = 10;
  private latestRoom: Room | null = null;
  private chatSeq = 0;

  private updateHandlers = new Set<RoomUpdateHandler>();
  private errorHandlers = new Set<RoomErrorHandler>();
  private chatHandlers = new Set<ChatHandler>();
  private canvasHandlers = new Set<CanvasEventHandler>();

  get activeSocketId(): string | null {
    return this.socketId;
  }

  get activeRoomCode(): string | null {
    return this.joinedRoomCode;
  }

  subscribe(onUpdate: RoomUpdateHandler, onError: RoomErrorHandler): () => void {
    this.updateHandlers.add(onUpdate);
    this.errorHandlers.add(onError);
    return () => {
      this.updateHandlers.delete(onUpdate);
      this.errorHandlers.delete(onError);
    };
  }

  subscribeChat(onChat: ChatHandler): () => void {
    this.chatHandlers.add(onChat);
    return () => {
      this.chatHandlers.delete(onChat);
    };
  }

  subscribeCanvas(onCanvas: CanvasEventHandler): () => void {
    this.canvasHandlers.add(onCanvas);
    return () => {
      this.canvasHandlers.delete(onCanvas);
    };
  }

  /**
   * Send an arbitrary typed intent once joined.
   * Returns false if the socket is not ready / not in a room.
   */
  sendRaw(type: WSEventType, payload: Record<string, unknown> = {}): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN || !this.joinedRoomCode) {
      return false;
    }
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  connect(userId: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      wsDebug("connect_skipped_already_open", { userId, socketId: this.socketId ?? undefined });
      return;
    }

    this.userId = userId;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  disconnect(): void {
    wsDebug("app_disconnect", {
      userId: this.userId,
      socketId: this.socketId ?? undefined,
      roomCode: this.joinedRoomCode,
      component: "AppWebSocketManager",
    });

    this.intentionalClose = true;
    this.clearTimers();
    this.joinedRoomCode = null;
    this.pendingJoinCode = null;
    this.latestRoom = null;

    if (this.socket) {
      this.safeClose(this.socket);
      this.socket = null;
    }

    this.socketId = null;
  }

  /** Seed baseline from REST so TIMER_UPDATED deltas can merge before JOIN ack. */
  seedRoom(room: Room): void {
    if (
      this.latestRoom?.code === room.code &&
      room.revision < this.latestRoom.revision
    ) {
      return;
    }
    this.latestRoom = room;
  }

  joinRoom(roomCode: string): void {
    const code = roomCode.toUpperCase();
    if (this.joinedRoomCode === code) return;

    this.pendingJoinCode = code;
    wsDebug("join_room_requested", {
      userId: this.userId,
      socketId: this.socketId ?? undefined,
      roomCode: code,
      component: "AppWebSocketManager",
    });

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendJoin(code);
    }
  }

  leaveRoom(): void {
    if (!this.joinedRoomCode && !this.pendingJoinCode) return;

    wsDebug("leave_room_requested", {
      userId: this.userId,
      socketId: this.socketId ?? undefined,
      roomCode: this.joinedRoomCode,
      component: "AppWebSocketManager",
    });

    this.pendingJoinCode = null;
    this.joinedRoomCode = null;
    this.latestRoom = null;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "LEAVE_ROOM", payload: {} }));
    }
  }

  setReady(ready: boolean): void {
    this.sendIntent(ready ? "PLAYER_READY" : "PLAYER_UNREADY");
  }

  updateSettings(settings: GameSettings): void {
    this.sendIntent("HOST_UPDATE_SETTINGS", {
      total_rounds: settings.rounds,
      round_duration_seconds: settings.roundDurationSeconds,
    });
  }

  startGame(): void {
    this.sendIntent("START_GAME");
  }

  selectWord(word: string): void {
    this.sendIntent("SELECT_WORD", { word });
  }

  sendChat(text: string): void {
    this.sendIntent("CHAT_MESSAGE", { text });
  }

  /** Drawing sync intents — backend canvas handlers accept these event names. */
  sendCanvasEvent(type: WSEventType, payload: Record<string, unknown> = {}): void {
    if (!this.sendRaw(type, payload)) {
      this.emitError({
        code: "NETWORK_ERROR",
        message: "Reconnect to the room before trying that again.",
      });
    }
  }

  private openSocket(): void {
    this.clearTimers();

    const id = nextSocketId();
    this.socketId = id;

    const wsUrl = getWsUrl("/ws");

    wsDebug("socket_created", {
      userId: this.userId,
      socketId: id,
      roomCode: this.pendingJoinCode ?? this.joinedRoomCode,
      component: "AppWebSocketManager",
      detail: wsUrl,
    });

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      if (this.intentionalClose) {
        this.safeClose(socket);
        return;
      }

      this.reconnectAttempts = 0;
      wsDebug("socket_open", { userId: this.userId, socketId: id, component: "AppWebSocketManager" });

      this.heartbeatTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "PING", payload: {} }));
        }
      }, 10_000);

      if (this.pendingJoinCode) {
        this.sendJoin(this.pendingJoinCode);
      } else if (this.joinedRoomCode) {
        this.sendJoin(this.joinedRoomCode);
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch {
        // ignore
      }
    };

    socket.onclose = (event) => {
      this.clearTimers();
      wsDebug("socket_closed", {
        userId: this.userId,
        socketId: id,
        roomCode: this.joinedRoomCode,
        component: "AppWebSocketManager",
        detail: `code=${event.code} reason=${event.reason}`,
      });

      // Preserve room for reconnect JOIN_ROOM; clear joined so joinRoom() won't early-return.
      if (this.joinedRoomCode && !this.pendingJoinCode) {
        this.pendingJoinCode = this.joinedRoomCode;
      }
      this.joinedRoomCode = null;

      if (this.socket === socket) {
        this.socket = null;
        this.socketId = null;
      }

      if (this.intentionalClose) return;

      if (event.code === 4003 || event.code === 4004) {
        this.pendingJoinCode = null;
        this.emitError({
          code: event.code === 4003 ? "AUTH_EXPIRED" : "NOT_IN_ROOM",
          message: event.reason || "Connection rejected",
        });
        return;
      }

      this.scheduleReconnect();
    };

    socket.onerror = () => {
      wsDebug("socket_error", { userId: this.userId, socketId: id, component: "AppWebSocketManager" });
    };
  }

  private sendJoin(roomCode: string): void {
    const code = roomCode.toUpperCase();
    this.pendingJoinCode = code;
    this.socket?.send(JSON.stringify({ type: "JOIN_ROOM", payload: { room_code: code } }));
  }

  private sendIntent(
    type: Extract<
      WSEventType,
      | "PLAYER_READY"
      | "PLAYER_UNREADY"
      | "HOST_UPDATE_SETTINGS"
      | "START_GAME"
      | "SELECT_WORD"
      | "CHAT_MESSAGE"
    >,
    payload: Record<string, unknown> = {},
  ): void {
    if (this.socket?.readyState !== WebSocket.OPEN || !this.joinedRoomCode) {
      this.emitError({
        code: "NETWORK_ERROR",
        message: "Reconnect to the room before trying that again.",
      });
      return;
    }
    this.socket.send(JSON.stringify({ type, payload }));
  }

  private applyRoomPayload(payload: Record<string, unknown>): Room | null {
    const nextRoom = mapRoomPayload(payload, this.latestRoom);
    if (!nextRoom) return null;
    if (
      this.latestRoom?.code === nextRoom.code &&
      nextRoom.revision < this.latestRoom.revision
    ) {
      wsDebug("stale_room_revision_ignored", {
        userId: this.userId,
        socketId: this.socketId ?? undefined,
        roomCode: nextRoom.code,
        component: "AppWebSocketManager",
        detail: `incoming=${nextRoom.revision} current=${this.latestRoom.revision}`,
      });
      return null;
    }
    this.latestRoom = nextRoom;
    this.joinedRoomCode = nextRoom.code;
    this.pendingJoinCode = null;
    this.emitUpdate(nextRoom);
    return nextRoom;
  }

  private handleMessage(msg: WSMessage): void {
    if (msg.type === "PLAYER_KICKED") {
      const kickedId = msg.payload.player_id as string | undefined;
      const kickedSelf =
        Boolean(msg.payload.kicked) ||
        (Boolean(kickedId) && kickedId === this.userId);

      if (kickedSelf) {
        this.joinedRoomCode = null;
        this.pendingJoinCode = null;
        this.emitError({
          code: "KICKED",
          message: (msg.payload.reason as string) || "You were kicked from the room.",
        });
        return;
      }

      this.applyRoomPayload(msg.payload);
      return;
    }

    if (msg.type === "TIMER_UPDATED") {
      if (!this.latestRoom) {
        wsDebug("timer_ignored_no_baseline", {
          userId: this.userId,
          socketId: this.socketId ?? undefined,
          component: "AppWebSocketManager",
        });
        return;
      }
      this.applyRoomPayload(msg.payload);
      return;
    }

    if (msg.type === "CHAT_MESSAGE") {
      const kindRaw = msg.payload.kind;
      const kind =
        kindRaw === "system" || kindRaw === "correct_guess" || kindRaw === "chat"
          ? kindRaw
          : "chat";
      const message =
        typeof msg.payload.message === "string" ? msg.payload.message : "";
      if (message) {
        this.chatSeq += 1;
        this.emitChat({
          id: `chat-${this.chatSeq}-${Date.now()}`,
          kind,
          message,
          playerId:
            typeof msg.payload.player_id === "string" ? msg.payload.player_id : null,
          playerName:
            typeof msg.payload.player_name === "string"
              ? msg.payload.player_name
              : null,
          at: Date.now(),
        });
      }
      // Correct guesses also bump scores / guessed flags via room snapshot.
      if (msg.payload.room || msg.payload.revision !== undefined) {
        this.applyRoomPayload(msg.payload);
      }
      return;
    }

    if (CANVAS_EVENTS.includes(msg.type)) {
      for (const handler of this.canvasHandlers) {
        handler(msg.type, msg.payload);
      }
      // Round-boundary clear also arrives as a lifecycle event with room snapshot.
      if (msg.type === "CANVAS_CLEAR" && (msg.payload.room || msg.payload.revision !== undefined)) {
        this.applyRoomPayload(msg.payload);
      }
      return;
    }

    if (ROOM_SYNC_EVENTS.includes(msg.type)) {
      const next = this.applyRoomPayload(msg.payload);
      if (!next && msg.payload.room_deleted) {
        this.joinedRoomCode = null;
        this.pendingJoinCode = null;
        this.latestRoom = null;
        this.emitError({
          code: "ROOM_NOT_FOUND",
          message: "The room was closed.",
        });
      }
      return;
    }

    if (msg.type === "PLAYER_CONNECTED" || msg.type === "PLAYER_DISCONNECTED") {
      return;
    }

    if (msg.type === "ROOM_LEFT") {
      this.joinedRoomCode = null;
      this.pendingJoinCode = null;
      this.latestRoom = null;
      return;
    }

    if (msg.type === "ERROR") {
      this.emitError({
        code: "UNKNOWN",
        message: (msg.payload.detail as string) || "WebSocket error",
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectAttempts >= this.maxReconnects) {
      if (!this.intentionalClose) {
        this.emitError({
          code: "NETWORK_ERROR",
          message: "Lost connection to the server. Refresh the page to reconnect.",
        });
      }
      return;
    }

    this.reconnectAttempts++;
    wsDebug("reconnect_scheduled", {
      userId: this.userId,
      socketId: this.socketId ?? undefined,
      roomCode: this.joinedRoomCode ?? this.pendingJoinCode,
      component: "AppWebSocketManager",
      detail: `attempt=${this.reconnectAttempts}`,
    });

    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30_000);
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
  }

  private safeClose(ws: WebSocket): void {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "Client disconnect");
      return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.onopen = () => ws.close(1000, "Client disconnect");
    }
  }

  private emitUpdate(room: Room): void {
    for (const handler of this.updateHandlers) handler(room);
  }

  private emitError(error: RoomError): void {
    for (const handler of this.errorHandlers) handler(error);
  }

  private emitChat(message: ChatMessage): void {
    for (const handler of this.chatHandlers) handler(message);
  }
}

export const appWebSocket = new AppWebSocketManager();

/** @deprecated Use appWebSocket.leaveRoom() — kept for call-site compatibility during migration. */
export function disconnectRoomSync(): void {
  appWebSocket.leaveRoom();
}
