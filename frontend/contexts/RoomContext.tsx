"use client";

/**
 * @deprecated Unused in production — use appWebSocket via RoomPresenceKeeper instead.
 * RoomProvider creates a second per-room socket if mounted alongside useRoom.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WebSocketService } from "@/services/websocket";
import { useSessionStore } from "@/stores/session";
import { useRoomStore } from "@/stores/room";
import type { ConnectionState, Room, RoomPlayer, WSEventType } from "@/types/room";

interface RoomContextValue {
  room: Room | null;
  players: RoomPlayer[];
  hostId: string | null;
  connectionState: ConnectionState;
  onlinePlayers: Set<string>;
  isConnected: boolean;
}

const RoomContext = createContext<RoomContextValue | null>(null);

interface RoomProviderProps {
  roomCode: string;
  initialRoom?: Room | null;
  children: ReactNode;
}

interface RoomResponse {
  code: string;
  host_id: string;
  status: string;
  max_players: number;
  created_at: string;
  players: Array<{ id: string; name: string; avatar_url: string | null }>;
}

function mapRoomPayload(data: RoomResponse): Room {
  return {
    code: data.code,
    hostId: data.host_id,
    status: data.status as Room["status"],
    maxPlayers: data.max_players,
    createdAt: data.created_at,
    players: data.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
    })),
  };
}

export function RoomProvider({ roomCode, initialRoom, children }: RoomProviderProps) {
  const selfId = useSessionStore((s) => s.selfId);
  const [room, setRoom] = useState<Room | null>(initialRoom ?? null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocketService | null>(null);

  const handleEvent = useCallback(
    (type: WSEventType, payload: Record<string, unknown>) => {
      switch (type) {
        case "ROOM_UPDATED":
        case "PLAYER_JOINED": {
          const roomData = payload.room as RoomResponse | undefined;
          if (roomData) {
            const mapped = mapRoomPayload(roomData);
            setRoom(mapped);
            useRoomStore.getState().setActiveRoom(mapped);
          }
          break;
        }

        case "PLAYER_CONNECTED": {
          const pid = payload.player_id as string;
          if (pid) {
            setOnlinePlayers((prev) => new Set([...prev, pid]));
          }
          break;
        }

        case "PLAYER_DISCONNECTED": {
          const pid = payload.player_id as string;
          if (pid) {
            setOnlinePlayers((prev) => {
              const next = new Set(prev);
              next.delete(pid);
              return next;
            });
          }
          break;
        }

        case "PLAYER_LEFT": {
          const pid = payload.player_id as string;
          if (pid) {
            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.filter((p) => p.id !== pid),
              };
            });
          }
          break;
        }

        case "PLAYER_KICKED": {
          const kickedId = payload.player_id as string;
          if (kickedId === selfId) {
            useRoomStore.getState().clearActiveRoom();
            setRoom(null);
          } else {
            const roomData = payload.room as RoomResponse | undefined;
            if (roomData) {
              setRoom(mapRoomPayload(roomData));
            }
          }
          break;
        }

        case "PONG":
          break;

        case "ERROR":
          break;

        default:
          break;
      }
    },
    [selfId],
  );

  useEffect(() => {
    if (!roomCode || !selfId) return;

    const service = new WebSocketService({
      roomCode,
      onStateChange: setConnectionState,
      onEvent: handleEvent,
    });

    wsRef.current = service;
    service.connect();

    return () => {
      service.disconnect();
      wsRef.current = null;
    };
  }, [roomCode, selfId, handleEvent]);

  const value: RoomContextValue = {
    room,
    players: room?.players ?? [],
    hostId: room?.hostId ?? null,
    connectionState,
    onlinePlayers,
    isConnected: connectionState === "connected",
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (ctx === null) {
    throw new Error("useRoomContext must be used within a RoomProvider");
  }
  return ctx;
}
