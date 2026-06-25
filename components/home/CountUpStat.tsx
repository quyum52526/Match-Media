"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  target: number;
  suffix?: string;
  label: string;
}

/**
 * Counts from 0 to `target` with an ease-out cubic curve over 2 s, triggered
 * once the element enters the viewport (IntersectionObserver, threshold 0.5).
 */
export function CountUpStat({ target, suffix = "", label }: Props) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fired.current) return;
        fired.current = true;

        const DURATION = 2000;
        const start = performance.now();

        function tick(now: number) {
          const elapsed = now - start;
          const t = Math.min(elapsed / DURATION, 1);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          setCount(Math.round(eased * target));
          if (t < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref}>
      <p className="font-display text-2xl font-medium tabular-nums text-accent">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-0.5 text-xs font-normal uppercase tracking-widest text-white/55">
        {label}
      </p>
    </div>
  );
}
