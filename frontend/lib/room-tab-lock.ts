/**
 * Prevents the same authenticated user from holding an active room session
 * across multiple browser tabs. Uses localStorage + heartbeat so locks survive
 * refreshes within the same tab but block concurrent tabs.
 *
 * Replace or complement with server-side presence when WebSockets land.
 */

const STORAGE_KEY = "svigl:room-tab-lock";
const TAB_ID_KEY = "svigl:room-tab-id";
const HEARTBEAT_MS = 2_000;
const STALE_MS = 5_000;

interface TabLock {
  userId: string;
  roomCode: string;
  tabId: string;
  updatedAt: number;
}

function getTabId(): string {
  if (typeof window === "undefined") return "server";

  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = crypto.randomUUID();
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
}

function readLock(): TabLock | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TabLock;
  } catch {
    return null;
  }
}

function writeLock(lock: TabLock): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lock));
}

function isLockActive(lock: TabLock, now: number): boolean {
  return now - lock.updatedAt < STALE_MS;
}

/** Attempt to claim the active room tab for this user + room. */
export function claimRoomTab(userId: string, roomCode: string): "claimed" | "blocked" {
  const tabId = getTabId();
  const now = Date.now();
  const normalizedCode = roomCode.toUpperCase();
  const existing = readLock();

  if (existing && existing.userId === userId && isLockActive(existing, now)) {
    if (existing.tabId !== tabId) {
      return "blocked";
    }
  }

  writeLock({ userId, roomCode: normalizedCode, tabId, updatedAt: now });
  return "claimed";
}

/** Keep the tab lock fresh while the room page is mounted. */
export function startRoomTabHeartbeat(userId: string, roomCode: string): () => void {
  const tabId = getTabId();
  const normalizedCode = roomCode.toUpperCase();

  const tick = () => {
    writeLock({ userId, roomCode: normalizedCode, tabId, updatedAt: Date.now() });
  };

  tick();
  const intervalId = window.setInterval(tick, HEARTBEAT_MS);

  return () => {
    window.clearInterval(intervalId);
    releaseRoomTab(userId, normalizedCode);
  };
}

/** Release the tab lock when leaving the room or unmounting. */
export function releaseRoomTab(userId: string, roomCode: string): void {
  const tabId = getTabId();
  const existing = readLock();
  const normalizedCode = roomCode.toUpperCase();

  if (
    existing &&
    existing.userId === userId &&
    existing.roomCode === normalizedCode &&
    existing.tabId === tabId
  ) {
    localStorage.removeItem(STORAGE_KEY);
  }
}
