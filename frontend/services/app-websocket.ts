/**
 * Application WebSocket — one authenticated connection per browser tab.
 *
 * Room membership changes via JOIN_ROOM / LEAVE_ROOM events on the same socket.
 * REST is still responsible for create/join/leave; this layer only syncs.
 */

import { getApiUrl } from "@/lib/api";
import { nextSocketId, wsDebug } from "@/lib/ws-debug";
import type { Room, RoomError, WSMessage } from "@/types/room";

interface RoomResponse {
  code: string;
  host_id: string;
  status: string;
  max_players: number;
  created_at: string;
  players: Array<{ id: string; name: string; avatar_url: string | null }>;
}

function mapWsRoom(data: RoomResponse): Room {
  return {
    code: data.code,
    hostId: data.host_id,
    status: data.status as Room["status"],
    maxPlayers: data.max_players,
    createdAt: data.created_at,
    players: data.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
    })),
  };
}

type RoomUpdateHandler = (room: Room) => void;
type RoomErrorHandler = (error: RoomError) => void;

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

  private updateHandlers = new Set<RoomUpdateHandler>();
  private errorHandlers = new Set<RoomErrorHandler>();

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

    if (this.socket) {
      this.safeClose(this.socket);
      this.socket = null;
    }

    this.socketId = null;
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

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "LEAVE_ROOM", payload: {} }));
    }
  }

  private openSocket(): void {
    this.clearTimers();

    const id = nextSocketId();
    this.socketId = id;

    const apiUrl = getApiUrl();
    const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

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

      if (this.socket === socket) {
        this.socket = null;
        this.socketId = null;
      }

      if (this.intentionalClose) return;

      if (event.code === 4003 || event.code === 4004) {
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

  private handleMessage(msg: WSMessage): void {
    if (
      msg.type === "ROOM_UPDATED" ||
      msg.type === "PLAYER_JOINED" ||
      msg.type === "PLAYER_KICKED" ||
      msg.type === "PLAYER_LEFT"
    ) {
      const roomData = msg.payload.room as RoomResponse | undefined;
      if (roomData) {
        this.joinedRoomCode = roomData.code;
        this.pendingJoinCode = null;
        this.emitUpdate(mapWsRoom(roomData));
      } else if (msg.payload.room_deleted) {
        this.joinedRoomCode = null;
        this.pendingJoinCode = null;
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
}

export const appWebSocket = new AppWebSocketManager();

/** @deprecated Use appWebSocket.leaveRoom() — kept for call-site compatibility during migration. */
export function disconnectRoomSync(): void {
  appWebSocket.leaveRoom();
}
