import { fetchRoom } from "@/services/room";
import { appWebSocket } from "@/services/app-websocket";
import type { Room, RoomError } from "@/types/room";

/**
 * Abstraction for receiving room updates.
 * Uses the tab-level AppWebSocket; REST bootstraps initial room state.
 */
export interface RoomSyncAdapter {
  subscribe(
    code: string,
    onUpdate: (room: Room) => void,
    onError: (error: RoomError) => void,
    options?: RoomSyncOptions,
  ): () => void;
}

export interface RoomSyncOptions {
  /** When false, only performs the initial REST fetch. Default true. */
  enableWebSocket?: boolean;
  /** Skip the REST bootstrap fetch (use when room was already loaded). Default false. */
  skipInitialFetch?: boolean;
}

export const DEFAULT_ROOM_POLL_INTERVAL_MS = 2_500;

export function createWebSocketSyncAdapter(): RoomSyncAdapter {
  return {
    subscribe(code, onUpdate, onError, options?: RoomSyncOptions) {
      const skipInitialFetch = options?.skipInitialFetch ?? false;
      const enableWebSocket = options?.enableWebSocket ?? true;
      let cancelled = false;

      if (!skipInitialFetch) {
        void fetchRoom(code)
          .then((room) => {
            if (!cancelled) onUpdate(room);
          })
          .catch((error) => {
            if (!cancelled) onError(error as RoomError);
          });
      }

      let unsubscribe: (() => void) | null = null;

      if (enableWebSocket) {
        unsubscribe = appWebSocket.subscribe(
          (room) => {
            if (!cancelled) onUpdate(room);
          },
          (error) => {
            if (!cancelled) onError(error);
          },
        );
      }

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    },
  };
}

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

export const roomSyncAdapter: RoomSyncAdapter = createWebSocketSyncAdapter();

export { disconnectRoomSync } from "@/services/app-websocket";
