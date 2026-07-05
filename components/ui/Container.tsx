import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Semantic element to render; page shells typically want <main>. */
  as?: ElementType;
}

/**
 * Global content container — the single source of truth for page width.
 *
 * Every page renders inside this rail (max-w-6xl + px-4), matching the
 * Header and Footer so all content edges line up app-wide. Do NOT pass
 * max-w-* overrides in className (cn() does not resolve conflicts); pages
 * that need a narrower block (forms, reading columns) should nest an inner
 * `mx-auto max-w-*` div INSIDE the container instead.
 *
 * Vertical padding stays per-page via className (e.g. "py-10").
 */
export function Container({
  as: Tag = "main",
  className,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-6xl px-4", className)}
      {...props}
    />
  );
}
