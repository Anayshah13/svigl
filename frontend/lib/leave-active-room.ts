import { releaseRoomTab } from "@/lib/room-tab-lock";
import { fetchActiveRoom, isUserInRoom, leaveRoom } from "@/services/room";
import { readPersistedRoomCode, useRoomStore } from "@/stores/room";
import type { RoomError } from "@/types/room";

/** Leaves the user's active room (if any) and clears local session state. */
export async function leaveActiveRoomIfAny(userId: string | null): Promise<void> {
  const store = useRoomStore.getState();
  let code = store.activeRoom?.code ?? readPersistedRoomCode();

  try {
    if (code) {
      await leaveRoom(code);
    } else if (userId) {
      const room = await fetchActiveRoom();
      if (room && isUserInRoom(room, userId)) {
        code = room.code;
        await leaveRoom(code);
      }
    }
  } catch (error) {
    const roomError = error as RoomError;
    if (roomError.code !== "NOT_IN_ROOM" && roomError.code !== "ROOM_NOT_FOUND") {
      throw error;
    }
  } finally {
    if (code && userId) {
      releaseRoomTab(userId, code);
    }
    store.clearActiveRoom();
  }
}
