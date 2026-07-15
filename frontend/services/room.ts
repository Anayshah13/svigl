import { ApiError, apiFetch, getApiUrl } from "@/lib/api";
import { normalizeRoomCode } from "@/lib/room-code";
import { mapRoomPayload } from "@/lib/room-payload";
import { ROOM_ERROR_MESSAGES, type Room, type RoomError } from "@/types/room";

function mapApiError(error: unknown): RoomError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as RoomError;
  }

  if (!(error instanceof ApiError)) {
    return { code: "UNKNOWN", message: ROOM_ERROR_MESSAGES.UNKNOWN };
  }

  if (error.status === 0) {
    return { code: "NETWORK_ERROR", message: ROOM_ERROR_MESSAGES.NETWORK_ERROR };
  }

  if (error.status === 401) {
    return { code: "AUTH_EXPIRED", message: ROOM_ERROR_MESSAGES.AUTH_EXPIRED };
  }

  if (error.status === 404) {
    return { code: "ROOM_NOT_FOUND", message: ROOM_ERROR_MESSAGES.ROOM_NOT_FOUND };
  }

  if (error.status === 410) {
    return { code: "ROOM_FINISHED", message: ROOM_ERROR_MESSAGES.ROOM_FINISHED };
  }

  if (error.status === 503) {
    return { code: "SERVER_UNAVAILABLE", message: ROOM_ERROR_MESSAGES.SERVER_UNAVAILABLE };
  }

  if (error.status === 403) {
    return { code: "NOT_HOST", message: ROOM_ERROR_MESSAGES.NOT_HOST };
  }

  if (error.status === 409) {
    const detail = error.detail?.toLowerCase() ?? "";

    if (detail.includes("full")) {
      return { code: "ROOM_FULL", message: ROOM_ERROR_MESSAGES.ROOM_FULL };
    }
    if (detail.includes("progress") || detail.includes("started")) {
      return { code: "ROOM_STARTED", message: ROOM_ERROR_MESSAGES.ROOM_STARTED };
    }
    if (detail.includes("another active room")) {
      return { code: "ALREADY_IN_ROOM", message: ROOM_ERROR_MESSAGES.ALREADY_IN_ROOM };
    }
    if (detail.includes("not in this room")) {
      return { code: "NOT_IN_ROOM", message: ROOM_ERROR_MESSAGES.NOT_IN_ROOM };
    }
    if (detail.includes("already in an active room")) {
      return { code: "ALREADY_IN_ROOM", message: ROOM_ERROR_MESSAGES.ALREADY_IN_ROOM };
    }
    if (detail.includes("kick yourself")) {
      return { code: "CANNOT_KICK_SELF", message: ROOM_ERROR_MESSAGES.CANNOT_KICK_SELF };
    }
    if (detail.includes("already the host")) {
      return { code: "ALREADY_HOST", message: ROOM_ERROR_MESSAGES.ALREADY_HOST };
    }
    if (detail.includes("player is not in this room")) {
      return { code: "TARGET_NOT_IN_ROOM", message: ROOM_ERROR_MESSAGES.TARGET_NOT_IN_ROOM };
    }
  }

  return { code: "UNKNOWN", message: ROOM_ERROR_MESSAGES.UNKNOWN };
}

async function roomRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(path, init);
  } catch (error) {
    throw mapApiError(error);
  }
}

function requireRoom(data: unknown): Room {
  const room = mapRoomPayload(data);
  if (!room) {
    throw { code: "UNKNOWN", message: ROOM_ERROR_MESSAGES.UNKNOWN } satisfies RoomError;
  }
  return room;
}

export async function createRoom(maxPlayers = 8): Promise<Room> {
  const data = await roomRequest<unknown>("/rooms", {
    method: "POST",
    body: JSON.stringify({ max_players: maxPlayers }),
  });
  return requireRoom(data);
}

export async function joinRoom(code: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<unknown>(`/rooms/${normalized}/join`, {
    method: "POST",
  });
  return requireRoom(data);
}

export async function leaveRoom(code: string): Promise<Room | null> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<unknown>(
    `/rooms/${normalized}/leave`,
    { method: "POST" },
  );

  return mapRoomPayload(data);
}

export async function fetchRoom(code: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<unknown>(`/rooms/${normalized}`);
  return requireRoom(data);
}

export async function fetchActiveRoom(): Promise<Room | null> {
  try {
    const data = await roomRequest<unknown>("/rooms/active");
    return requireRoom(data);
  } catch (error) {
    const roomError = error as RoomError;
    if (roomError.code === "ROOM_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

/** Keep the player marked as connected; also triggers stale-player eviction server-side. */
export async function pingRoomPresence(code: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<unknown>(`/rooms/${normalized}/presence`, {
    method: "POST",
  });
  return requireRoom(data);
}

/** Best-effort leave when the tab or window is closing. */
export function leaveRoomBeacon(code: string): void {
  const normalized = normalizeRoomCode(code);
  void fetch(`${getApiUrl()}/rooms/${normalized}/leave`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  });
}

/** Host kicks a player from the room. */
export async function kickPlayer(code: string, playerId: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<unknown>(`/rooms/${normalized}/kick`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
  return requireRoom(data);
}

/** Host transfers the host role to another player. */
export async function transferHost(code: string, playerId: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<unknown>(`/rooms/${normalized}/transfer-host`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
  return requireRoom(data);
}

export function isUserInRoom(room: Room, userId: string | null): boolean {
  if (!userId) return false;
  return room.players.some((player) => player.id === userId);
}

export function getHostName(room: Room): string {
  const host = room.players.find((player) => player.id === room.hostId);
  return host?.name ?? "Unknown";
}
