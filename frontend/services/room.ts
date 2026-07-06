import { ApiError, apiFetch } from "@/lib/api";
import { normalizeRoomCode } from "@/lib/room-code";
import { ROOM_ERROR_MESSAGES, type Room, type RoomError, type RoomStatus } from "@/types/room";

interface PlayerResponse {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface RoomResponse {
  code: string;
  host_id: string;
  status: RoomStatus;
  max_players: number;
  created_at: string;
  players: PlayerResponse[];
}

function mapRoom(data: RoomResponse): Room {
  return {
    code: data.code,
    hostId: data.host_id,
    status: data.status,
    maxPlayers: data.max_players,
    createdAt: data.created_at,
    players: data.players.map((player) => ({
      id: player.id,
      name: player.name,
      avatarUrl: player.avatar_url,
    })),
  };
}

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

export async function createRoom(maxPlayers = 8): Promise<Room> {
  const data = await roomRequest<RoomResponse>("/rooms", {
    method: "POST",
    body: JSON.stringify({ max_players: maxPlayers }),
  });
  return mapRoom(data);
}

export async function joinRoom(code: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<RoomResponse>(`/rooms/${normalized}/join`, {
    method: "POST",
  });
  return mapRoom(data);
}

export async function leaveRoom(code: string): Promise<Room | null> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<RoomResponse | { detail: string }>(
    `/rooms/${normalized}/leave`,
    { method: "POST" },
  );

  if (data && "code" in data) {
    return mapRoom(data);
  }

  return null;
}

export async function fetchRoom(code: string): Promise<Room> {
  const normalized = normalizeRoomCode(code);
  const data = await roomRequest<RoomResponse>(`/rooms/${normalized}`);
  return mapRoom(data);
}

export async function fetchActiveRoom(): Promise<Room | null> {
  try {
    const data = await roomRequest<RoomResponse>("/rooms/active");
    return mapRoom(data);
  } catch (error) {
    const roomError = error as RoomError;
    if (roomError.code === "ROOM_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export function isUserInRoom(room: Room, userId: string | null): boolean {
  if (!userId) return false;
  return room.players.some((player) => player.id === userId);
}

export function getHostName(room: Room): string {
  const host = room.players.find((player) => player.id === room.hostId);
  return host?.name ?? "Unknown";
}
