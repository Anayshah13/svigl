/**
 * Analytics facade for Svigl.
 *
 * Why this module exists:
 * - Keeps call sites free of provider-specific APIs (`gtag`, Clarity, PostHog).
 * - Lets us add Microsoft Clarity, PostHog, or other sinks later without rewriting
 *   every `trackEvent(...)` usage across the app.
 * - Centralizes SSR / missing-ID safety so analytics never throws in production.
 *
 * Page views: `@next/third-parties` `GoogleAnalytics` + GA4 Enhanced Measurement
 * already record `page_view` on history changes. Do NOT call `trackPageView` from
 * a global router listener — that would duplicate page views.
 *
 * Implementation note: we talk to `window.gtag` / `dataLayer` directly instead of
 * importing `sendGAEvent` from `@next/third-parties` so this module stays safe to
 * import from shared utilities (e.g. `apiFetch`) that may load on the server.
 */

/** GA4-friendly custom event params (primitives only). */
export type AnalyticsParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Canonical custom event names (snake_case per GA4 convention).
 * Prefer these constants at call sites to avoid typos / drift.
 */
export const AnalyticsEvents = {
  // Authentication
  LOGIN_GOOGLE: "login_google",
  LOGIN_GUEST: "login_guest",
  LOGOUT: "logout",

  // Landing
  LANDING_VIEW: "landing_view",
  PLAY_CLICKED: "play_clicked",
  CREATE_ROOM_CLICKED: "create_room_clicked",

  // Rooms
  ROOM_CREATED: "room_created",
  ROOM_JOINED: "room_joined",
  ROOM_LEFT: "room_left",

  // Gameplay
  GAME_STARTED: "game_started",
  GAME_FINISHED: "game_finished",
  ROUND_STARTED: "round_started",
  ROUND_FINISHED: "round_finished",

  // Player actions
  PLAYER_GUESSED: "player_guessed",
  PLAYER_DREW: "player_drew",

  // Errors
  WEBSOCKET_DISCONNECTED: "websocket_disconnected",
  API_ERROR: "api_error",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function getMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

/** True only in the browser when a Measurement ID is configured. */
function canTrack(): boolean {
  return typeof window !== "undefined" && Boolean(getMeasurementId());
}

function cleanParams(
  params?: AnalyticsParams,
): Record<string, string | number | boolean | null> | undefined {
  if (!params) return undefined;
  const cleaned: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
}

/**
 * Record a custom GA4 event. No-ops during SSR and when GA is not configured.
 * Safe to call from any client handler — never throws.
 */
export function trackEvent(
  name: AnalyticsEventName | string,
  params?: AnalyticsParams,
): void {
  if (!canTrack()) return;

  try {
    // gtag is defined by the root `GoogleAnalytics` snippet (even before the
    // remote gtag.js finishes loading). If it is missing, skip — do not throw.
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, cleanParams(params));
  } catch {
    // Analytics must never break product flows.
  }
}

/**
 * Manual page_view helper for rare cases (e.g. virtual views).
 *
 * Prefer relying on automatic SPA pageviews from the root `GoogleAnalytics`
 * component. Only use this if Enhanced Measurement history pageviews are
 * disabled in the GA4 Admin panel — otherwise you will double-count.
 */
export function trackPageView(url: string): void {
  if (!canTrack()) return;

  const gaId = getMeasurementId();
  if (!gaId || typeof window.gtag !== "function") return;

  try {
    window.gtag("config", gaId, { page_path: url });
  } catch {
    // no-op
  }
}

/**
 * Associate subsequent hits with a stable user id (GA4 `user_id`).
 * Stub-friendly: no-ops when GA / gtag is unavailable.
 */
export function identifyUser(id: string): void {
  if (!canTrack() || !id) return;

  const gaId = getMeasurementId();
  if (!gaId || typeof window.gtag !== "function") return;

  try {
    window.gtag("config", gaId, { user_id: id });
  } catch {
    // no-op
  }
}
