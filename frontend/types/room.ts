/** Room lifecycle status — mirrors backend values. */
export type RoomStatus = "WAITING" | "PLAYING" | "FINISHED";

export type GamePhase =
  | "LOBBY"
  | "COUNTDOWN"
  | "WORD_SELECTION"
  | "ROUND_ACTIVE"
  | "ROUND_END"
  | "GAME_FINISHED";

export interface GameSettings {
  rounds: number;
  roundDurationSeconds: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  isReady: boolean;
  isWaiting: boolean;
  isConnected?: boolean;
  score?: number;
}

export interface GameDrawer {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ScoreEntry {
  playerId: string;
  score: number;
  roundPoints: number;
  hasGuessedCorrectly: boolean;
  isActive: boolean;
}

export interface RoundGuessedEntry {
  playerId: string;
  playerName: string;
  points: number;
}

/** Present on ROUND_ENDED / round-end snapshots. */
export interface RoundSummary {
  word: string | null;
  drawerId: string | null;
  guessed: RoundGuessedEntry[];
  scores: ScoreEntry[];
}

export interface RoomGameState {
  sessionId: string | null;
  phase: GamePhase;
  revision: number;
  serverTime: string | null;
  phaseEndsAt: string | null;
  remainingSeconds: number | null;
  roundNumber: number;
  /** Monotonic drawing epoch (canvas/hints); not remapped when roster grows. */
  currentTurn: number;
  totalRounds: number;
  drawer: GameDrawer | null;
  activePlayerIds: string[];
  waitingPlayerIds: string[];
  /** Underscore mask for guessers, e.g. `_ _ _ _`. */
  wordHint: string | null;
  wordLength: number | null;
  /** Only present for the drawer (or after round-end reveal). */
  secretWord: string | null;
  /** Only present for the drawer during WORD_SELECTION. */
  wordChoices: string[] | null;
  scores: ScoreEntry[];
  guessedPlayerIds: string[];
  winnerId: string | null;
  /** Last round summary from ROUND_ENDED (cleared on next round). */
  roundSummary: RoundSummary | null;
}

/** Public room shape — uses room code as the identifier, not database IDs. */
export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  createdAt: string;
  players: RoomPlayer[];
  settings: GameSettings;
  game: RoomGameState;
  readyPlayerIds: string[];
  waitingPlayerIds: string[];
  canStart: boolean;
  revision: number;
}

export type ChatMessageKind =
  | "chat"
  | "system"
  | "correct_guess"
  | "close_guess"
  | "private_chat";

export interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  message: string;
  playerId: string | null;
  playerName: string | null;
  at: number;
}

export type RoomErrorCode =
  | "INVALID_CODE"
  | "EMPTY_CODE"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_STARTED"
  | "ROOM_FINISHED"
  | "ALREADY_IN_ROOM"
  | "NOT_IN_ROOM"
  | "NOT_A_MEMBER"
  | "NOT_HOST"
  | "CANNOT_KICK_SELF"
  | "ALREADY_HOST"
  | "TARGET_NOT_IN_ROOM"
  | "TAB_BLOCKED"
  | "KICKED"
  | "AUTH_EXPIRED"
  | "NETWORK_ERROR"
  | "SERVER_UNAVAILABLE"
  | "UNKNOWN";

export interface RoomError {
  code: RoomErrorCode;
  message: string;
}

export const ROOM_ERROR_MESSAGES: Record<RoomErrorCode, string> = {
  INVALID_CODE: "Room codes are 4 letters (A–Z). Check the code and try again.",
  EMPTY_CODE: "Enter a room code to join.",
  ROOM_NOT_FOUND: "That room doesn't exist. Check the code and try again.",
  ROOM_FULL: "This room is full. Ask the host to increase capacity or try another room.",
  ROOM_STARTED: "This game has already started. You can't join now.",
  ROOM_FINISHED: "This room has finished. Create a new room to play again.",
  ALREADY_IN_ROOM:
    "You're already in another room. Use the session bar at the bottom to return or leave before joining a new one.",
  NOT_IN_ROOM: "You're not in this room.",
  NOT_A_MEMBER: "You're not in this room. Join with the code or head back home.",
  NOT_HOST: "Only the host can do that.",
  CANNOT_KICK_SELF: "You can't kick yourself. Leave the room instead.",
  ALREADY_HOST: "That player is already the host.",
  TARGET_NOT_IN_ROOM: "That player is not in this room.",
  TAB_BLOCKED:
    "This room is already open in another tab. Close the other tab, then refresh this page.",
  KICKED: "You were kicked from the room.",
  AUTH_EXPIRED: "Your session expired. Please sign in again.",
  NETWORK_ERROR: "Couldn't reach the server. Check your connection and try again.",
  SERVER_UNAVAILABLE: "The server is temporarily unavailable. Please try again shortly.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  WAITING: "Waiting for players",
  PLAYING: "Game in progress",
  FINISHED: "Finished",
};

/** WebSocket connection lifecycle states. */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

/** Typed event names matching backend EventType. */
export type WSEventType =
  | "PING"
  | "PONG"
  | "JOIN_ROOM"
  | "LEAVE_ROOM"
  | "ROOM_LEFT"
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "PLAYER_CONNECTED"
  | "PLAYER_DISCONNECTED"
  | "ROOM_UPDATED"
  | "PLAYER_KICKED"
  | "VOTE_KICK"
  | "VOTE_KICK_UPDATE"
  | "PLAYER_READY"
  | "PLAYER_UNREADY"
  | "HOST_UPDATE_SETTINGS"
  | "START_GAME"
  | "SELECT_WORD"
  | "CHAT_MESSAGE"
  | "GAME_STARTED"
  | "COUNTDOWN_STARTED"
  | "WORD_CHOICES_OFFERED"
  | "WORD_SELECTED"
  | "ROUND_STARTED"
  | "ROUND_ENDED"
  | "GAME_FINISHED"
  | "TIMER_UPDATED"
  | "PLAYER_WAITING"
  | "GAME_STATE_UPDATED"
  | "HOST_CHANGED"
  | "PLAYER_GUESSED"
  | "SCORES_UPDATED"
  | "HINT_UPDATED"
  | "CANVAS_CLEAR"
  | "CANVAS_SNAPSHOT_REQUEST"
  | "SHAPE_CREATED"
  | "SHAPE_UPDATED"
  | "SHAPE_DELETED"
  | "CANVAS_CLEARED"
  | "UNDO"
  | "REDO"
  | "CANVAS_SNAPSHOT"
  | "ERROR";

/** Wire format for all WebSocket messages. */
export interface WSMessage {
  type: WSEventType;
  payload: Record<string, unknown>;
}
