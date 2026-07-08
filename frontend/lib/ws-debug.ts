/**
 * TEMPORARY WebSocket lifecycle logger for architecture audit.
 * Remove once socket lifecycle is verified stable.
 */

export interface WsDebugEntry {
  ts: number;
  event: string;
  socketId?: string;
  roomCode?: string | null;
  userId?: string | null;
  component?: string;
  detail?: string;
}

const MAX_ENTRIES = 200;
const entries: WsDebugEntry[] = [];
let socketCounter = 0;

export function nextSocketId(): string {
  socketCounter += 1;
  return `ws-${socketCounter}`;
}

export function wsDebug(
  event: string,
  meta: Omit<WsDebugEntry, "ts" | "event"> = {},
): void {
  const entry: WsDebugEntry = { ts: Date.now(), event, ...meta };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[ws-debug] ${event}`,
      meta.socketId ?? "",
      meta.roomCode ?? "",
      meta.component ?? "",
      meta.detail ?? "",
    );
  }
}

export function getWsDebugTimeline(): WsDebugEntry[] {
  return [...entries];
}

if (typeof window !== "undefined") {
  (window as Window & { __wsDebugTimeline?: () => WsDebugEntry[] }).__wsDebugTimeline =
    getWsDebugTimeline;
}
