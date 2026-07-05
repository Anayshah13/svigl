import { getApiUrl } from "@/lib/api";

export interface AuthUser {
  id: string;
  googleId: string | null;
  email: string;
  username: string;
  avatarUrl: string | null;
  provider: "google";
}

const AUTH_STORAGE_KEY = "svigl:auth-user";

export function startGoogleSignIn(): void {
  window.location.href = `${getApiUrl()}/auth/google`;
}

export function loadStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistAuthUser(user: AuthUser): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuthUser(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function parseAuthCallbackParams(params: URLSearchParams): AuthUser | null {
  const id = params.get("id");
  const email = params.get("email");
  const name = params.get("name");

  if (!id || !email || !name) return null;

  const googleId = params.get("google_id");
  const avatarUrl = params.get("avatar_url");

  return {
    id,
    googleId: googleId || null,
    email,
    username: name,
    avatarUrl: avatarUrl || null,
    provider: "google",
  };
}

export function fetchAuthSession(): Promise<AuthUser | null> {
  return Promise.resolve(loadStoredAuthUser());
}

export function signOut(): Promise<void> {
  clearStoredAuthUser();
  return Promise.resolve();
}
