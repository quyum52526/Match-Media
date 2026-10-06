"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Frosted-glass card with a cursor spotlight, a glowing border that tracks the
 * pointer, and an optional subtle 3D tilt.
 *
 * Pure CSS + transforms: pointer position is written straight into CSS custom
 * properties (`--gx`, `--gy`, `--rx`, `--ry`) inside a single rAF, so moving
 * the mouse never re-renders React. Tilt only runs on fine pointers (not
 * touch) and is disabled under `prefers-reduced-motion`.
 */
export function GlowCard({
  children,
  className,
  enableTilt = false,
  maxTilt = 4,
  glowColor = "140, 47, 74",
  featured = false,
}: {
  children: ReactNode;
  className?: string;
  enableTilt?: boolean;
  /** Max rotation in degrees on each axis. */
  maxTilt?: number;
  /** Spotlight / border tint as an "r, g, b" triple. Defaults to Garnet. */
  glowColor?: string;
  /** Stronger gold/garnet base glow for a highlighted card (e.g. best-value plan). */
  featured?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const tiltOk = useRef(false);

  useEffect(() => {
    tiltOk.current =
      enableTilt &&
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [enableTilt]);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const { clientX, clientY } = e;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        el.style.setProperty("--gx", `${x}px`);
        el.style.setProperty("--gy", `${y}px`);
        el.style.setProperty("--glow", "1");
        if (tiltOk.current) {
          const px = x / r.width - 0.5;
          const py = y / r.height - 0.5;
          el.style.setProperty("--rx", `${(-py * 2 * maxTilt).toFixed(2)}deg`);
          el.style.setProperty("--ry", `${(px * 2 * maxTilt).toFixed(2)}deg`);
          el.style.transitionDuration = "120ms";
        }
      });
    },
    [maxTilt],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    el.style.setProperty("--glow", "0");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    // Longer, eased return so the card settles back instead of snapping.
    el.style.transitionDuration = "500ms";
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        // Base (pre-hover) ambient glow: garnet-tinted hairline + soft halo so
        // cards lift off the ivory canvas before the cursor arrives.
        "group/glow relative isolate h-full overflow-hidden rounded-card border bg-white/75 backdrop-blur-xl",
        featured
          ? "border-accent/50 shadow-[0_0_0_1px_rgba(200,162,75,0.18),0_8px_28px_-4px_rgba(200,162,75,0.28),0_4px_20px_-2px_rgba(140,47,74,0.10)]"
          : "border-primary/15 shadow-[0_4px_20px_-2px_rgba(140,47,74,0.06)]",
        "transition-[transform,box-shadow] ease-out will-change-transform hover:shadow-[0_10px_30px_-4px_rgba(140,47,74,0.14)]",
        className,
      )}
      style={
        {
          "--gx": "50%",
          "--gy": "50%",
          "--glow": "0",
          "--rx": "0deg",
          "--ry": "0deg",
          transform:
            "perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry))",
          transitionDuration: "500ms",
        } as React.CSSProperties
      }
    >
      {/* Spotlight fill */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
        style={{
          opacity: "var(--glow)",
          background: `radial-gradient(320px circle at var(--gx) var(--gy), rgba(${glowColor}, 0.08), transparent 70%)`,
        }}
      />
      {/* Border glow — a 1px ring masked to the card edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] p-px transition-opacity duration-300"
        style={{
          opacity: "var(--glow)",
          background: `radial-gradient(220px circle at var(--gx) var(--gy), rgba(${glowColor}, 0.55), transparent 70%)`,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      {children}
    </div>
  );
}
