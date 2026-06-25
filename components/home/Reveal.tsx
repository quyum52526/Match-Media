"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealMode = "up" | "scale";

const HIDDEN: Record<RevealMode, string> = {
  up: "opacity-0 translate-y-4",
  scale: "opacity-0 scale-95",
};

/**
 * Stripe-style scroll reveal: a soft fade + slide-up (or scale-in) the first
 * time the element enters the viewport. Tailwind transitions only — no animation
 * library. `delay` enables staggered/cascading reveals. Honors
 * prefers-reduced-motion (renders immediately, no transform).
 */
export function Reveal({
  children,
  delay = 0,
  mode = "up",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  mode?: RevealMode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform motion-reduce:transition-none",
        shown ? "translate-y-0 scale-100 opacity-100" : HIDDEN[mode],
        className,
      )}
    >
      {children}
    </div>
  );
}
