import { copyTextToClipboard } from "@/lib/clipboard";
import { normalizeRoomCode } from "@/lib/room-code";

export function buildRoomInviteUrl(code: string): string {
  const normalized = normalizeRoomCode(code);
  if (typeof window === "undefined") {
    return `/room/${normalized}`;
  }
  return `${window.location.origin}/room/${normalized}`;
}

export function buildRoomInviteMessage(code: string): string {
  const normalized = normalizeRoomCode(code);
  const url = buildRoomInviteUrl(normalized);
  return `Join my Svigl game! Room code: ${normalized}\n${url}`;
}

export type InviteShareResult = "copied" | "shared" | "cancelled" | "failed";

export async function copyRoomCode(code: string): Promise<boolean> {
  return copyTextToClipboard(normalizeRoomCode(code));
}

export async function shareRoomInvite(code: string): Promise<InviteShareResult> {
  const normalized = normalizeRoomCode(code);
  const url = buildRoomInviteUrl(normalized);
  const text = `Join my Svigl game! Room code: ${normalized}`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Join my Svigl game",
        text,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const copied = await copyTextToClipboard(buildRoomInviteMessage(normalized));
  return copied ? "copied" : "failed";
}
