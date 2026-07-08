/**
 * Distinguish page reload from tab/window close.
 *
 * `pagehide` fires for both, so we must not leave a room on reload.
 * Uses the Navigation API (reload navigations) with a keyboard fallback.
 */

const RELOAD_FLAG = "svigl:page-reloading";

let initialized = false;

export function initPageLifecycle(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  window.addEventListener("pageshow", () => {
    sessionStorage.removeItem(RELOAD_FLAG);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "F5") {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") {
      sessionStorage.setItem(RELOAD_FLAG, "1");
    }
  });

  const navigation = (window as Window & { navigation?: Navigation }).navigation;
  if (navigation) {
    navigation.addEventListener("navigate", (event: NavigateEvent) => {
      if (event.navigationType === "reload") {
        sessionStorage.setItem(RELOAD_FLAG, "1");
      }
    });
  }
}

/** True while a reload is in progress (set before `pagehide`, cleared on `pageshow`). */
export function isPageReload(): boolean {
  return sessionStorage.getItem(RELOAD_FLAG) === "1";
}
