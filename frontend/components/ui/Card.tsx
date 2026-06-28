import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass-panel rounded-2xl p-6", className)}
      {...rest}
    />
  );
}
