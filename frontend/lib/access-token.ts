/**
 * Client-held JWT for browsers that block cross-site cookies (Safari ITP).
 * Cookie auth remains preferred when the browser allows it.
 */

const ACCESS_TOKEN_KEY = "svigl:access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* private mode / quota */
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
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
    const hash = window.location.hash.replace(/^#/, "");
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
