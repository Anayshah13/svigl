import * as React from "react";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[140px] w-full resize-y rounded-xl border border-plum/15 bg-white/90 px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-colors focus-visible:border-plum/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/20",
      className,
    )}
    {...rest}
  />
));
Textarea.displayName = "Textarea";
