export interface AuthUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  provider: "google" | "guest";
}

export function fetchAuthSession(): Promise<AuthUser | null> {
  return Promise.resolve(null);
}

export function signOut(): Promise<void> {
  return Promise.resolve();
}
