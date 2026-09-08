import { getAccessToken } from "@/lib/access-token";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";

/**
 * Backend HTTP base URL (no trailing slash).
 * Local default keeps `npm run dev` working without env files.
 * Production must set NEXT_PUBLIC_API_URL at build time.
 */
export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL must be set in production");
  }
  return "http://localhost:8000";
}

/** Attach Bearer token when present (Safari ITP / cross-site cookie fallback). */
export function withAuthHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  const token = getAccessToken();
  if (token && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${token}`);
  }
  return next;
}

/**
 * Backend WebSocket URL including path (e.g. ws://host/ws or wss://host/ws).
 * Prefer NEXT_PUBLIC_WS_URL as the WS origin (scheme + host[+port]), optionally
 * ending in `/ws`. Path is always appended for the active endpoint.
 */
export function getWsUrl(path = "/ws"): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) {
    const base = explicit.replace(/\/$/, "").replace(/\/ws$/i, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  const api = getApiUrl();
  const wsBase = api
    .replace(/^https:\/\//i, "wss://")
    .replace(/^http:\/\//i, "ws://");
  return `${wsBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(status: number, detail: string | null, message?: string) {
    super(message ?? detail ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Chromium / undici often reject an aborted fetch as
 * `TypeError: signal is aborted without reason` instead of `AbortError`.
 */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  if (name === "AbortError") return true;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    /signal is aborted|operation was aborted|The user aborted/i.test(message)
  );
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = withAuthHeaders(init?.headers);

  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Path only (no query) — avoids leaking tokens in analytics payloads.
  const analyticsPath = path.split("?")[0] || path;

  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch (error) {
    // Aborts are intentional (timeouts, reset, unmount) — never label them as
    // network failures or they spam the AI Guesser UI.
    if (isAbortError(error) || init?.signal?.aborted) {
      throw error instanceof Error
        ? error
        : new DOMException("The operation was aborted.", "AbortError");
    }
    trackEvent(AnalyticsEvents.API_ERROR, {
      status: 0,
      path: analyticsPath,
      reason: "network",
    });
    throw new ApiError(0, null, "Network request failed");
  }

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  const detail = typeof payload?.detail === "string" ? payload.detail : null;
  trackEvent(AnalyticsEvents.API_ERROR, {
    status: response.status,
    path: analyticsPath,
  });
  throw new ApiError(response.status, detail);
}
