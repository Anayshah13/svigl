"use client";

import { create } from "zustand";
import type { AuthUser } from "@/services/auth";

interface SessionState {
  selfId: string | null;
  displayName: string;
  isGuest: boolean;
  authUser: AuthUser | null;
  authReady: boolean;
  setDisplayName: (name: string) => void;
  setSelfId: (id: string | null) => void;
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
  setAuthReady: (ready: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  selfId: null,
  displayName: "",
  isGuest: true,
  authUser: null,
  authReady: false,
  setDisplayName: (displayName) => set({ displayName }),
  setSelfId: (selfId) => set({ selfId }),
  setAuth: (user) =>
    set((state) => ({
      authUser: user,
      isGuest: user.provider === "guest",
      displayName: state.displayName.trim() ? state.displayName : user.username,
    })),
  clearAuth: () =>
    set({
      authUser: null,
      isGuest: true,
    }),
  setAuthReady: (authReady) => set({ authReady }),
}));
