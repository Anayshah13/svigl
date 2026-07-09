"use client";

import { createStore } from "@/lib/create-store";
import type { Room, RoomStatus } from "@/types/room";

const STORAGE_KEY = "svigl:active-room-code";

export function readPersistedRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function persistRoomCode(code: string | null): void {
  if (typeof window === "undefined") return;
  if (code) {
    localStorage.setItem(STORAGE_KEY, code);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface ActiveRoomSnapshot {
  code: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
}

interface RoomStoreState {
  activeRoom: ActiveRoomSnapshot | null;
  setActiveRoom: (room: Room) => void;
  syncActiveRoom: (room: Room) => void;
  clearActiveRoom: () => void;
}

export const useRoomStore = createStore<RoomStoreState>((set) => ({
  activeRoom: null,

  setActiveRoom: (room) => {
    persistRoomCode(room.code);
    set({
      activeRoom: {
        code: room.code,
        status: room.status,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
      },
    });
  },

  syncActiveRoom: (room) => {
    persistRoomCode(room.code);
    set({
      activeRoom: {
        code: room.code,
        status: room.status,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
      },
    });
  },

  clearActiveRoom: () => {
    persistRoomCode(null);
    set({ activeRoom: null });
  },
}));
