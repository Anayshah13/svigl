import Link from "next/link";
import { cn } from "@/lib/cn";

const LOGO_SIZES = {
  sm: "text-xl",
  default: "text-3xl",
  lg: "text-4xl sm:text-5xl",
  hero: "text-[clamp(3rem,14vw,4.75rem)]",
} as const;

export function SviglLogo({
  className,
  size = "default",
}: {
  className?: string;
  size?: keyof typeof LOGO_SIZES;
}) {
  return (
    <Link
      href="/"
      aria-label="Svigl home"
      className={cn("group inline-flex items-center", className)}
    >
      <span
        className={cn(
          "script-accent font-bold leading-none tracking-tight transition-transform duration-300 group-hover:scale-[1.03]",
          LOGO_SIZES[size],
        )}
      >
        Svigl
      </span>
    </Link>
  );
}
