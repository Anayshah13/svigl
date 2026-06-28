import Link from "next/link";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";

export function SviglLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:rotate-12"
      >
        <path
          d="M4 20 Q14 4 24 20"
          stroke={colors.plum}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14" cy="18" r="2" fill={colors.chartreuse} />
      </svg>
      <span className="text-xl font-bold tracking-tight text-ink">
        Svigl<span style={{ color: colors.plum }}>.</span>
      </span>
    </Link>
  );
}
