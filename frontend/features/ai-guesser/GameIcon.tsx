import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export type GameIconId =
  | "sports"
  | "places"
  | "motion"
  | "pop-culture"
  | "wild-card"
  | "free-play";

export type GameAccent = "plum" | "pink" | "green" | "chartreuse" | "blue";

export const GAME_ACCENT_TEXT: Record<GameAccent, string> = {
  plum: "text-plum",
  pink: "text-pink",
  green: "text-green",
  chartreuse: "text-ink",
  blue: "text-blue",
};

export const GAME_ACCENT_BG: Record<GameAccent, string> = {
  plum: "bg-plum-light",
  pink: "bg-pink-light",
  green: "bg-green-light",
  chartreuse: "bg-[rgba(187,227,49,0.22)]",
  blue: "bg-blue-light",
};

export const GAME_ACCENT_RING: Record<GameAccent, string> = {
  plum: "ring-plum/20",
  pink: "ring-pink/25",
  green: "ring-green/20",
  chartreuse: "ring-chartreuse/35",
  blue: "ring-blue/25",
};

function SportsIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 6.8c1.4 1.8 2.6 5.4 2.6 10.4M16 6.8c-1.4 1.8-2.6 5.4-2.6 10.4M5.6 10.2h12.8M5.6 13.8h12.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlacesIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M6 20V9.5L12 5l6 4.5V20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path
        d="M9 11h.01M15 11h.01M9 14.5h.01M15 14.5h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MotionIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M4 8.5l5 3.5-5 3.5M11 8.5l5 3.5-5 3.5M18.5 9.5L21 12l-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PopCultureIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M12 4.5l2.1 4.4 4.8.7-3.5 3.4.8 4.8L12 15.6 7.8 17.8l.8-4.8-3.5-3.4 4.8-.7L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WildCardIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.2 8.2 6.5 6.5M15.8 8.2 17.5 6.5M8.2 15.8 6.5 17.5M15.8 15.8 17.5 17.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function FreePlayIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M4 12c0-2.2 1.6-4 3.5-4 2.4 0 3.6 2 4.5 4s2.1 4 4.5 4c1.9 0 3.5-1.8 3.5-4s-1.6-4-3.5-4c-2.4 0-3.6 2-4.5 4s-2.1 4-4.5 4C5.6 16 4 14.2 4 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS: Record<GameIconId, ComponentType<IconProps>> = {
  sports: SportsIcon,
  places: PlacesIcon,
  motion: MotionIcon,
  "pop-culture": PopCultureIcon,
  "wild-card": WildCardIcon,
  "free-play": FreePlayIcon,
};

const GAME_VISUAL: Record<string, { icon: GameIconId; accent: GameAccent }> = {
  sports: { icon: "sports", accent: "green" },
  places: { icon: "places", accent: "blue" },
  motion: { icon: "motion", accent: "pink" },
  "pop-culture": { icon: "pop-culture", accent: "plum" },
  "wild-card": { icon: "wild-card", accent: "chartreuse" },
  "free-play": { icon: "free-play", accent: "plum" },
};

export function visualForGame(slug: string): { icon: GameIconId; accent: GameAccent } {
  return GAME_VISUAL[slug] ?? { icon: "wild-card", accent: "plum" };
}

export function GameIcon({
  id,
  className,
}: {
  id: GameIconId;
  className?: string;
}) {
  const Icon = ICONS[id] ?? WildCardIcon;
  return <Icon className={cn("h-6 w-6", className)} />;
}
