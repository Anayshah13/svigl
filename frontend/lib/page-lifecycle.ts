/**
 * Distinguish page reload from tab/window close.
 *
 * `pagehide` fires for both, so we must not leave a room on reload.
 * Chromium: Navigation API + keyboard. Safari/iPad: no reliable client signal —
 * callers should skip aggressive leave and rely on server disconnect grace.
 */

const RELOAD_FLAG = "svigl:page-reloading";

/** Minimal Navigation API types — not yet in all TypeScript DOM libs. */
interface AppNavigateEvent extends Event {
  navigationType: string;
}

interface AppNavigation {
  addEventListener(
    type: "navigate",
    listener: (event: AppNavigateEvent) => void,
  ): void;
}

let initialized = false;
let navigationApiAvailable = false;

function markReload(): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function initPageLifecycle(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  window.addEventListener("pageshow", () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignore */
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "F5") {
      markReload();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") {
      markReload();
    }
  });

  const navigation = (window as Window & { navigation?: AppNavigation }).navigation;
  if (navigation) {
    navigationApiAvailable = true;
    navigation.addEventListener("navigate", (event) => {
      if (event.navigationType === "reload") {
        markReload();
      }
    });
  }
}

/**
 * True when we positively detected a reload (Navigation API or keyboard).
 * False does not mean "tab close" — Safari often cannot detect reload at all.
 */
export function isPageReload(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * When false (Safari/iPad), do not REST-leave on `pagehide` — reload and close
 * are indistinguishable. Server disconnect grace cleans up closed tabs.
 */
export function canDetectReloadReliably(): boolean {
  return navigationApiAvailable;
}
