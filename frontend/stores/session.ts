"use client";

import { createStore } from "@/lib/create-store";
import type { AuthUser } from "@/services/auth";

/** Temporary audit logging — remove after auth stability is confirmed. */
function authLog(event: string, detail?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[auth] ${event}`, detail ?? "");
}

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

export const useSessionStore = createStore<SessionState>((set) => ({
  selfId: null,
  displayName: "",
  isGuest: true,
  authUser: null,
  authReady: false,
  setDisplayName: (displayName) => set({ displayName }),
  setSelfId: (selfId) => set({ selfId }),
  setAuth: (user) => {
    authLog("auth state updated", {
      action: "setAuth",
      userId: user.id,
      provider: user.provider,
    });
    set({
      authUser: user,
      isGuest: user.provider === "guest",
      selfId: user.id,
      displayName: user.username,
    });
  },
  clearAuth: () =>
    set({
      authUser: null,
      isGuest: true,
      selfId: null,
      displayName: "",
    }),
  setAuthReady: (authReady) => {
    authLog("auth state updated", { action: "setAuthReady", authReady });
    set({ authReady });
  },
}));
