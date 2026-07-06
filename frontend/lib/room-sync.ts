import { fetchRoom } from "@/services/room";
import type { Room, RoomError } from "@/types/room";

/**
 * Abstraction for receiving room updates. Polling today; swap for WebSocket
 * by implementing the same interface in a future `createWebSocketSyncAdapter`.
 */
export interface RoomSyncAdapter {
  subscribe(
    code: string,
    onUpdate: (room: Room) => void,
    onError: (error: RoomError) => void,
  ): () => void;
}

export const DEFAULT_ROOM_POLL_INTERVAL_MS = 2_500;

export function createPollingSyncAdapter(intervalMs = DEFAULT_ROOM_POLL_INTERVAL_MS): RoomSyncAdapter {
  return {
    subscribe(code, onUpdate, onError) {
      let cancelled = false;
      let inFlight = false;

      const poll = async () => {
        if (cancelled || inFlight) return;
        inFlight = true;
        try {
          const room = await fetchRoom(code);
          if (!cancelled) onUpdate(room);
        } catch (error) {
          if (!cancelled) onError(error as RoomError);
        } finally {
          inFlight = false;
        }
      };

      void poll();
      const intervalId = window.setInterval(() => void poll(), intervalMs);

      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
      };
    },
  };
}

/** Singleton polling adapter — replace export when WebSockets ship. */
export const roomSyncAdapter: RoomSyncAdapter = createPollingSyncAdapter();
