import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "verified" | "neutral" | "gold" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  verified: "bg-verifyGreen/10 text-verifyGreen",
  neutral: "bg-charcoal/5 text-charcoal/70",
  gold: "bg-gold/10 text-gold",
  outline: "border border-charcoal/15 text-charcoal/70",
};

export function Badge({
  className,
  variant = "neutral",
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
