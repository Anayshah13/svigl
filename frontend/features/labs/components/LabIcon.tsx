import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";
import type { LabIconId } from "../types";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function CircleIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function SquareIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function TriangleIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M12 5.5L19.5 18.5H4.5L12 5.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfinityIcon({ className, ...rest }: IconProps) {
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

function HeartIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M12 19s-6.5-4.2-8.2-7.4C2.2 9.2 3.4 6.5 6.2 6.1c1.7-.3 3.3.5 4.3 1.8C11.5 6.6 13.1 5.8 14.8 6.1c2.8.4 4 3.1 2.4 5.5C15.5 14.8 12 19 12 19Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ className, ...rest }: IconProps) {
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

function HexagonIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M12 3.5l7 4v9l-7 4-7-4v-9l7-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StrokeIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M5 17c3-8 5-10 7-10s4 2 7 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="5" cy="17" r="1.25" fill="currentColor" />
      <circle cx="19" cy="17" r="1.25" fill="currentColor" />
    </svg>
  );
}

function MemoryIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <rect x="4.5" y="5.5" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="5.5" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4.5" y="14" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14.5 17.25h4M16.5 15.25v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function MatchIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <circle cx="8.5" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="8" width="7" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function BezierIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...rest}>
      <path
        d="M5 17C5 10 10 7 12 7s7 3 7 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="5" cy="17" r="1.5" fill="currentColor" />
      <circle cx="19" cy="17" r="1.5" fill="currentColor" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

const ICONS: Record<LabIconId, ComponentType<IconProps>> = {
  circle: CircleIcon,
  square: SquareIcon,
  triangle: TriangleIcon,
  infinity: InfinityIcon,
  heart: HeartIcon,
  star: StarIcon,
  hexagon: HexagonIcon,
  stroke: StrokeIcon,
  memory: MemoryIcon,
  match: MatchIcon,
  bezier: BezierIcon,
};

export function LabIcon({
  id,
  className,
}: {
  id: LabIconId;
  className?: string;
}) {
  const Icon = ICONS[id] ?? CircleIcon;
  return <Icon className={cn("h-6 w-6", className)} />;
}
