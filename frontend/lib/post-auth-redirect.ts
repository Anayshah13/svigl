import { normalizeRoomCode, validateRoomCode } from "@/lib/room-code";

const STORAGE_KEY = "svigl:post-auth-redirect";

/** Allowed post-login destinations (open redirect protection). */
export function sanitizePostAuthRedirect(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  const [pathname] = trimmed.split("?");

  if (pathname === "/") return "/";

  const roomMatch = pathname.match(/^\/room\/([A-Za-z]{4})$/);
  if (roomMatch) {
    const code = normalizeRoomCode(roomMatch[1]);
    if (validateRoomCode(code)) return null;
    return `/room/${code}`;
  }

  return null;
}

export function storePostAuthRedirect(path: string): void {
  const safe = sanitizePostAuthRedirect(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, safe);
  } catch {
    // sessionStorage may be unavailable in some privacy modes
  }
}

export function readStoredPostAuthRedirect(): string | null {
  try {
    return sanitizePostAuthRedirect(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearStoredPostAuthRedirect(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Prefer explicit `next`, then stored redirect, then home. */
export function resolvePostAuthRedirect(nextParam: string | null): string {
  const fromParam = sanitizePostAuthRedirect(nextParam);
  if (fromParam) return fromParam;

  const fromStorage = readStoredPostAuthRedirect();
  if (fromStorage) return fromStorage;

  return "/";
}

export function buildSignInUrl(returnPath: string, message?: string): string {
  const safe = sanitizePostAuthRedirect(returnPath);
  if (!safe) return "/sign-in";

  const params = new URLSearchParams({ next: safe });
  if (message) params.set("message", message);
  return `/sign-in?${params.toString()}`;
}

export function redirectToSignInWithReturn(
  router: { replace: (href: string) => void },
  returnPath?: string,
  message?: string,
): void {
  const path =
    returnPath ??
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");

  storePostAuthRedirect(path);
  router.replace(buildSignInUrl(path, message));
}
