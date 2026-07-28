import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-widest text-plum">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[clamp(1.75rem,6vw,2.5rem)] font-bold tracking-tight text-ink sm:mt-2">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-xl text-sm text-ink-muted sm:mt-2 sm:text-base">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
