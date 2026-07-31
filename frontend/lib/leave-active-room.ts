import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { releaseRoomTab } from "@/lib/room-tab-lock";
import { appWebSocket } from "@/services/app-websocket";
import { fetchActiveRoom, isUserInRoom, leaveRoom } from "@/services/room";
import { readPersistedRoomCode, useRoomStore } from "@/stores/room";
import type { RoomError } from "@/types/room";

/** Leaves the user's active room (if any) and clears local session state. */
export async function leaveActiveRoomIfAny(userId: string | null): Promise<void> {
  const store = useRoomStore.getState();
  let code = store.activeRoom?.code ?? readPersistedRoomCode();
  let leftRoomCode: string | null = null;

  try {
    if (code) {
      await leaveRoom(code);
      leftRoomCode = code;
    } else if (userId) {
      const room = await fetchActiveRoom();
      if (room && isUserInRoom(room, userId)) {
        code = room.code;
        await leaveRoom(code);
        leftRoomCode = code;
      }
    }
  } catch (error) {
    const roomError = error as RoomError;
    if (roomError.code !== "NOT_IN_ROOM" && roomError.code !== "ROOM_NOT_FOUND") {
      throw error;
    }
  } finally {
    appWebSocket.leaveRoom();
    if (code && userId) {
      releaseRoomTab(userId, code);
    }
    store.clearActiveRoom();
    if (leftRoomCode) {
      trackEvent(AnalyticsEvents.ROOM_LEFT, {
        room_code: leftRoomCode,
        method: "sign_out",
      });
    }
  }
}

/** Full socket teardown — use on sign-out. */
export function disconnectAppWebSocket(): void {
  appWebSocket.disconnect();
}
