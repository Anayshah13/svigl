import Link from "next/link";
import { cn } from "@/lib/cn";

const SIZE = {
  sm: {
    svigl: "text-2xl",
    flask: "h-6 w-[1.15rem]",
    slash: "h-6",
    gap: "gap-1.5",
    eyebrow: "text-[0.45rem] tracking-[0.32em]",
    labs: "text-sm",
    labsGap: "gap-0.5",
  },
  /** Page headers inside a lab (detail / leaderboard). */
  md: {
    svigl: "text-[2.35rem] sm:text-[2.75rem]",
    flask: "h-8 w-6 sm:h-9 sm:w-7",
    slash: "h-8 sm:h-9",
    gap: "gap-2 sm:gap-2.5",
    eyebrow: "text-[0.5rem] sm:text-[0.55rem] tracking-[0.36em]",
    labs: "text-lg sm:text-xl",
    labsGap: "gap-0.5",
  },
  default: {
    svigl: "text-[2.75rem]",
    flask: "h-9 w-7",
    slash: "h-9",
    gap: "gap-2.5",
    eyebrow: "text-[0.55rem] tracking-[0.38em]",
    labs: "text-xl",
    labsGap: "gap-0.5",
  },
  lg: {
    svigl: "text-[3.25rem] sm:text-[3.75rem]",
    flask: "h-11 w-8",
    slash: "h-10 sm:h-12",
    gap: "gap-3 sm:gap-4",
    eyebrow: "text-[0.6rem] tracking-[0.4em]",
    labs: "text-[1.85rem] sm:text-[2.1rem]",
    labsGap: "gap-1",
  },
} as const;

function FlaskMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 64" className={cn("rotate-6", className)} aria-hidden>
      <path
        d="M18 6 h12 v14 l11 28 a8 8 0 0 1 -7 11 H14 a8 8 0 0 1 -7 -11 L18 20 Z"
        fill="none"
        stroke="#703F93"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M14 42 h20"
        stroke="#703F93"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      <path d="M15 46 Q24 58 33 46" fill="#BBE331" fillOpacity="0.9" />
      <circle cx="20" cy="50" r="1.8" fill="#FAFAF8" fillOpacity="0.75" />
      <circle cx="26" cy="52" r="1.2" fill="#FAFAF8" fillOpacity="0.5" />
      <rect x="19" y="3" width="10" height="5" rx="1.5" fill="#703F93" />
    </svg>
  );
}

export function SviglLabsLogo({
  className,
  size = "default",
  href = "/labs",
  link = true,
  "aria-label": ariaLabel = "Svigl Labs home",
}: {
  className?: string;
  size?: keyof typeof SIZE;
  href?: string;
  /** When false, renders a non-link mark (e.g. inside another heading). */
  link?: boolean;
  "aria-label"?: string;
}) {
  const s = SIZE[size];

  const mark = (
    <span
      className={cn(
        "inline-flex items-center transition-transform duration-300",
        link && "group-hover:scale-[1.02]",
        s.gap,
        className,
      )}
    >
      <span
        className={cn(
          "script-accent font-bold leading-none tracking-tight text-plum",
          s.svigl,
        )}
      >
        Svigl
      </span>
      <FlaskMark className={s.flask} />
      <span className={cn("w-px rotate-12 self-center bg-plum/30", s.slash)} aria-hidden />
      <span className={cn("flex flex-col", s.labsGap)}>
        <span
          className={cn(
            "font-mono font-semibold uppercase text-plum/50",
            s.eyebrow,
          )}
        >
          Experimental
        </span>
        <span
          className={cn(
            "font-display leading-none tracking-wide text-green",
            s.labs,
          )}
        >
          Labs
        </span>
      </span>
    </span>
  );

  if (!link) {
    return mark;
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group inline-flex items-center"
    >
      {mark}
    </Link>
  );
}
