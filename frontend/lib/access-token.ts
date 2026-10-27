/**
 * Client-held JWT for browsers that block cross-site cookies (Safari ITP).
 * Cookie auth remains preferred when the browser allows it.
 *
 * Stored in localStorage so the session survives new tabs and a full
 * navigation to /ai-guesser — sessionStorage is tab-scoped and looked
 * like a fresh sign-out.
 */

const ACCESS_TOKEN_KEY = "svigl:access_token";

function readStorage(storage: Storage): string | null {
  try {
    return storage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, token: string): void {
  try {
    storage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* private mode / quota */
  }
}

function removeStorage(storage: Storage): void {
  try {
    storage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromLocal = readStorage(window.localStorage);
  if (fromLocal) return fromLocal;
  const fromSession = readStorage(window.sessionStorage);
  if (fromSession) {
    writeStorage(window.localStorage, fromSession);
    return fromSession;
  }
  return null;
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  writeStorage(window.localStorage, token);
  writeStorage(window.sessionStorage, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  removeStorage(window.localStorage);
  removeStorage(window.sessionStorage);
}

/**
 * Read `access_token` from the OAuth callback URL (query or hash) and strip it
 * so the JWT is not left in history after sign-in.
 */
export function consumeAccessTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  let token = url.searchParams.get("access_token");

  if (!token) {
    const hash = url.hash.replace(/^#/, "");
    if (hash) {
      token = new URLSearchParams(hash).get("access_token");
    }
  }

  if (!token) return null;

  url.searchParams.delete("access_token");
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  hashParams.delete("access_token");
  const nextHash = hashParams.toString();
  url.hash = nextHash ? `#${nextHash}` : "";

  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  setAccessToken(token);
  return token;
}
