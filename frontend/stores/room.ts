"use client";

import { create } from "zustand";
import type { ChatMessage, Room } from "@/types/domain";

interface RoomStore {
  room: Room | null;
  chat: ChatMessage[];
  wordChoices: string[] | null;
  revealedWord: string | null;
  galleryDrawingId: string | null;
  setRoom: (room: Room | null) => void;
  setChat: (chat: ChatMessage[]) => void;
  setGalleryDrawingId: (drawingId: string | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  chat: [],
  wordChoices: null,
  revealedWord: null,
  galleryDrawingId: null,
  setRoom: (room) => set({ room }),
  setChat: (chat) => set({ chat }),
  setGalleryDrawingId: (galleryDrawingId) => set({ galleryDrawingId }),
  reset: () =>
    set({ room: null, chat: [], wordChoices: null, revealedWord: null, galleryDrawingId: null }),
}));
