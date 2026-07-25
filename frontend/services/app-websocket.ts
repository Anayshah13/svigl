/**
 * Application WebSocket — one authenticated connection per browser tab.
 *
 * Room membership changes via JOIN_ROOM / LEAVE_ROOM events on the same socket.
 * REST is still responsible for create/join/leave; this layer only syncs.
 */

import { getAccessToken } from "@/lib/access-token";
import { getWsUrl } from "@/lib/api";
import { mapRoomPayload } from "@/lib/room-payload";
import type {
  ChatMessage,
  GameSettings,
  Room,
  RoomError,
  WSEventType,
  WSMessage,
} from "@/types/room";

function buildAuthenticatedWsUrl(path = "/ws"): string {
  const base = getWsUrl(path);
  const token = getAccessToken();
  if (!token) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}access_token=${encodeURIComponent(token)}`;
}

type RoomUpdateHandler = (room: Room) => void;
type RoomErrorHandler = (error: RoomError) => void;
type ChatHandler = (message: ChatMessage) => void;
type CanvasEventHandler = (type: WSEventType, payload: Record<string, unknown>) => void;

export interface VoteKickTally {
  targetId: string;
  votes: number;
  required: number;
  playerCount: number;
  voterIds: string[];
  kicked: boolean;
  retracted: boolean;
  cleared: boolean;
}

type VoteKickHandler = (tally: VoteKickTally) => void;

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
  "HINT_UPDATED",
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

/** Server closed this socket because another tab registered the same user. */
const WS_REPLACED_BY_NEW_CONNECTION = 4001;
const WS_AUTH_FAILED = 4003;
const WS_NOT_A_MEMBER = 4004;

class AppWebSocketManager {
  private socket: WebSocket | null = null;
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
  private voteKickHandlers = new Set<VoteKickHandler>();

  get activeRoomCode(): string | null {
    return this.joinedRoomCode;
  }

  get bufferedAmount(): number {
    return this.socket?.bufferedAmount ?? 0;
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

  subscribeVoteKick(onVote: VoteKickHandler): () => void {
    this.voteKickHandlers.add(onVote);
    return () => {
      this.voteKickHandlers.delete(onVote);
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
      return;
    }

    this.userId = userId;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    this.joinedRoomCode = null;
    this.pendingJoinCode = null;
    this.latestRoom = null;

    if (this.socket) {
      this.safeClose(this.socket);
      this.socket = null;
    }
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

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendJoin(code);
    }
  }

  leaveRoom(): void {
    if (!this.joinedRoomCode && !this.pendingJoinCode) return;

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

  voteKick(targetId: string, retract = false): void {
    this.sendIntent("VOTE_KICK", { target_id: targetId, retract });
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

    const socket = new WebSocket(buildAuthenticatedWsUrl("/ws"));
    this.socket = socket;

    socket.onopen = () => {
      if (this.intentionalClose) {
        this.safeClose(socket);
        return;
      }

      this.reconnectAttempts = 0;

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

      // Preserve room for reconnect JOIN_ROOM; clear joined so joinRoom() won't early-return.
      if (this.joinedRoomCode && !this.pendingJoinCode) {
        this.pendingJoinCode = this.joinedRoomCode;
      }
      this.joinedRoomCode = null;

      if (this.socket === socket) {
        this.socket = null;
      }

      if (this.intentionalClose) return;

      // Another tab took this user's socket — do not fight for it.
      if (event.code === WS_REPLACED_BY_NEW_CONNECTION) {
        this.pendingJoinCode = null;
        this.intentionalClose = true;
        return;
      }

      if (event.code === WS_AUTH_FAILED || event.code === WS_NOT_A_MEMBER) {
        this.pendingJoinCode = null;
        this.emitError({
          code: event.code === WS_AUTH_FAILED ? "AUTH_EXPIRED" : "NOT_IN_ROOM",
          message: event.reason || "Connection rejected",
        });
        return;
      }

      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose handles reconnect / terminal codes
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
      | "VOTE_KICK"
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
      if (!this.latestRoom) return;
      this.applyRoomPayload(msg.payload);
      return;
    }

    if (msg.type === "CHAT_MESSAGE") {
      const kindRaw = msg.payload.kind;
      const kind =
        kindRaw === "system" ||
        kindRaw === "correct_guess" ||
        kindRaw === "close_guess" ||
        kindRaw === "private_chat" ||
        kindRaw === "chat"
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

    if (msg.type === "VOTE_KICK_UPDATE") {
      const cleared = Boolean(msg.payload.cleared);
      const targetId =
        typeof msg.payload.target_id === "string" ? msg.payload.target_id : "";
      const voterIds = Array.isArray(msg.payload.voter_ids)
        ? msg.payload.voter_ids.filter((id): id is string => typeof id === "string")
        : [];
      const tally: VoteKickTally = {
        targetId,
        votes: typeof msg.payload.votes === "number" ? msg.payload.votes : 0,
        required: typeof msg.payload.required === "number" ? msg.payload.required : 0,
        playerCount:
          typeof msg.payload.player_count === "number" ? msg.payload.player_count : 0,
        voterIds,
        kicked: Boolean(msg.payload.kicked),
        retracted: Boolean(msg.payload.retracted),
        cleared,
      };
      for (const handler of this.voteKickHandlers) {
        handler(tally);
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
      if (msg.type === "GAME_STARTED") {
        for (const handler of this.voteKickHandlers) {
          handler({
            targetId: "",
            votes: 0,
            required: 0,
            playerCount: 0,
            voterIds: [],
            kicked: false,
            retracted: false,
            cleared: true,
          });
        }
      }
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
