export interface AuthUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  provider: "mock" | "guest";
}

const MOCK_USER: AuthUser = {
  id: "mock-user-1",
  username: "Prototype User",
  avatarUrl: null,
  provider: "mock",
};

const MOCK_GUEST: AuthUser = {
  id: "mock-guest-1",
  username: "Guest",
  avatarUrl: null,
  provider: "guest",
};

let currentUser: AuthUser | null = null;

export function fetchAuthSession(): Promise<AuthUser | null> {
  return Promise.resolve(currentUser);
}

export function signInAsMockUser(): Promise<AuthUser> {
  currentUser = MOCK_USER;
  return Promise.resolve(MOCK_USER);
}

export function signInAsGuest(): Promise<AuthUser> {
  currentUser = MOCK_GUEST;
  return Promise.resolve(MOCK_GUEST);
}

export function signOut(): Promise<void> {
  currentUser = null;
  return Promise.resolve();
}
