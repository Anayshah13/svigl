import { ROOM_ERROR_MESSAGES, type RoomError, type RoomErrorCode } from "@/types/room";

/** 4-letter room code used by the backend (A–Z). */
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_PATTERN = /^[A-Z]{4}$/;

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase();
}

export function validateRoomCode(input: string): RoomError | null {
  const code = normalizeRoomCode(input);

  if (!code) {
    return { code: "EMPTY_CODE", message: ROOM_ERROR_MESSAGES.EMPTY_CODE };
  }

  if (!ROOM_CODE_PATTERN.test(code)) {
    return { code: "INVALID_CODE", message: ROOM_ERROR_MESSAGES.INVALID_CODE };
  }

  return null;
}

export function formatRoomCodeInput(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, ROOM_CODE_LENGTH);
}

export function toRoomError(code: RoomErrorCode, override?: string): RoomError {
  return { code, message: override ?? ROOM_ERROR_MESSAGES[code] };
}
