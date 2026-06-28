import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "pink" | "green";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-plum text-white shadow-md hover:brightness-110",
  secondary: "bg-plum-light text-plum hover:bg-pink-light",
  pink: "bg-pink text-ink shadow-md hover:brightness-105",
  green: "bg-green text-white shadow-md hover:brightness-110",
  ghost: "bg-transparent text-ink hover:bg-plum-light/60",
  outline: "border border-plum/25 bg-white/80 text-ink hover:border-plum/50 hover:bg-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 focus-visible:ring-offset-2 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = "Button";
