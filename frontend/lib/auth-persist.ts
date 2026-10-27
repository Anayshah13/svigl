import type { AuthUser } from "@/services/auth";

const AUTH_USER_KEY = "svigl:auth_user";

export function readPersistedAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed || typeof parsed.id !== "string" || !parsed.id) return null;
    if (parsed.provider !== "google" && parsed.provider !== "guest") return null;
    if (typeof parsed.username !== "string") return null;
    return {
      id: parsed.id,
      email: typeof parsed.email === "string" ? parsed.email : null,
      username: parsed.username,
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      provider: parsed.provider,
      drawingsDone: typeof parsed.drawingsDone === "number" ? parsed.drawingsDone : 0,
      likesReceived: typeof parsed.likesReceived === "number" ? parsed.likesReceived : 0,
      dislikesReceived: typeof parsed.dislikesReceived === "number" ? parsed.dislikesReceived : 0,
    };
  } catch {
    return null;
  }
}

export function writePersistedAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* private mode / quota */
  }
}

export function clearPersistedAuthUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* ignore */
  }
}
