/** Room lifecycle status — mirrors backend values. */
export type RoomStatus = "WAITING" | "PLAYING" | "FINISHED";

export interface RoomPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Public room shape — uses room code as the identifier, not database IDs. */
export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  createdAt: string;
  players: RoomPlayer[];
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
  | "TAB_BLOCKED"
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
  TAB_BLOCKED:
    "This room is already open in another tab. Close the other tab, then refresh this page.",
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
