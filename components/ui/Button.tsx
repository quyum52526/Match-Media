import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "gold" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  // Primary CTA: Garnet → Garnet Dark on hover (per Brand v1.0).
  primary: "bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary",
  secondary: "bg-secondary text-canvas hover:bg-secondary/90 focus-visible:ring-secondary",
  gold: "bg-accent text-white hover:bg-accent/90 focus-visible:ring-accent",
  outline:
    "border border-primary text-primary bg-transparent hover:bg-primary/5 focus-visible:ring-primary",
  ghost: "text-ink hover:bg-ink/5 focus-visible:ring-ink",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-all duration-150 ease-in-out active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
