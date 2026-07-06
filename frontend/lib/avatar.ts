import { colors, palette } from "@/lib/colors";

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((channel) => parseInt(channel, 16) / 255) ?? [0, 0, 0];

  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function avatarBackgroundColor(name: string): string {
  const normalized = name.trim() || "?";
  return palette[hashName(normalized) % palette.length];
}

export function avatarTextColor(background: string): string {
  return luminance(background) > 0.55 ? colors.ink : colors.whitePure;
}

export function avatarInitial(name: string): string {
  const trimmed = name.trim();
  return (trimmed.charAt(0) || "?").toUpperCase();
}
