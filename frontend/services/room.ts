import { generateRoomCode } from "@/services/localRoom";

export const ROOM_CODE_PLACEHOLDER = "ABCD";

export async function createRoom(_displayName: string): Promise<string> {
  return generateRoomCode();
}
