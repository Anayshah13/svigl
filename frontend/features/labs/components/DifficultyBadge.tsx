import { cn } from "@/lib/cn";
import type { LabDifficulty } from "../types";

const DIFFICULTY_STYLES: Record<LabDifficulty, string> = {
  easy: "bg-green-light text-green",
  medium: "bg-plum-light text-plum",
  hard: "bg-pink-light text-pink",
};

const DIFFICULTY_LABELS: Record<LabDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: LabDifficulty;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        DIFFICULTY_STYLES[difficulty],
        className,
      )}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
