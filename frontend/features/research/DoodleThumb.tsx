import { strokesToPath, type Stroke } from "./doodles";

export function DoodleThumb({
  drawing,
  className = "h-14 w-14",
  animate = false,
}: {
  drawing: Stroke[] | null | undefined;
  className?: string;
  animate?: boolean;
}) {
  const d = drawing?.length ? strokesToPath(drawing) : "";
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      {d ? (
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate ? "research-ink" : undefined}
        />
      ) : (
        <rect
          x="24"
          y="24"
          width="208"
          height="208"
          rx="24"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="4"
        />
      )}
    </svg>
  );
}
