import { AnaiFace } from "@/features/anai/mascots";
import { cn } from "@/lib/cn";

export function BotBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex rounded-full bg-ink/8 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted",
        className,
      )}
    >
      Bot
    </span>
  );
}

export function RobotAvatar({
  name = "AnAI 1.3 Pro",
  className,
}: {
  name?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full bg-bg-base",
        className,
      )}
      role="img"
      aria-label={`${name} robot avatar`}
    >
      <AnaiFace className="h-[118%] w-[118%] -translate-y-[4%]" />
    </div>
  );
}
