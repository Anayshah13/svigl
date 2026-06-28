"use client";

import { create } from "zustand";

export interface PreferencesState {
  soundEffects: boolean;
  showPlayerCursors: boolean;
  showChatTimestamps: boolean;
  compactChat: boolean;
  defaultStrokeWidth: 2 | 4 | 6;
  setSoundEffects: (v: boolean) => void;
  setShowPlayerCursors: (v: boolean) => void;
  setShowChatTimestamps: (v: boolean) => void;
  setCompactChat: (v: boolean) => void;
  setDefaultStrokeWidth: (v: 2 | 4 | 6) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = "svigl-preferences";

const defaults = {
  soundEffects: true,
  showPlayerCursors: true,
  showChatTimestamps: false,
  compactChat: false,
  defaultStrokeWidth: 2 as const,
};

type PersistedPrefs = Omit<
  PreferencesState,
  | "setSoundEffects"
  | "setShowPlayerCursors"
  | "setShowChatTimestamps"
  | "setCompactChat"
  | "setDefaultStrokeWidth"
  | "resetPreferences"
>;

function load(): Partial<PersistedPrefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedPrefs>) : {};
  } catch {
    return {};
  }
}

function persist(state: PersistedPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...defaults,
  ...load(),
  setSoundEffects: (soundEffects) => {
    const next = { ...get(), soundEffects };
    persist(next);
    set({ soundEffects });
  },
  setShowPlayerCursors: (showPlayerCursors) => {
    const next = { ...get(), showPlayerCursors };
    persist(next);
    set({ showPlayerCursors });
  },
  setShowChatTimestamps: (showChatTimestamps) => {
    const next = { ...get(), showChatTimestamps };
    persist(next);
    set({ showChatTimestamps });
  },
  setCompactChat: (compactChat) => {
    const next = { ...get(), compactChat };
    persist(next);
    set({ compactChat });
  },
  setDefaultStrokeWidth: (defaultStrokeWidth) => {
    const next = { ...get(), defaultStrokeWidth };
    persist(next);
    set({ defaultStrokeWidth });
  },
  resetPreferences: () => {
    persist(defaults);
    set(defaults);
  },
}));
