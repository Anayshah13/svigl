import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-plum/15 bg-white/90 px-4 text-sm text-ink placeholder:text-ink-muted transition-colors focus-visible:border-plum/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/20",
      className,
    )}
    {...rest}
  />
));
Input.displayName = "Input";
