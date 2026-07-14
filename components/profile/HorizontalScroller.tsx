"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type MouseEvent,
} from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

interface HorizontalScrollerProps {
  className?: string;
  children: ReactNode;
  /**
   * Render floating Prev/Next arrow buttons over the row (desktop pointer
   * devices only). They page the row by ~90% of its width and auto-disable
   * at each end. Off by default so existing callers are unaffected.
   */
  showArrows?: boolean;
}

/**
 * Makes a horizontal-overflow row scrollable with a mouse — which browsers do
 * NOT do natively:
 *   • vertical wheel  → horizontal scroll (only while the row can move that way,
 *     so page scroll still works at the ends)
 *   • click-and-drag  → scroll (with click suppression so a drag never fires the
 *     card's button/link)
 *   • Prev/Next arrows (opt-in via showArrows) → page the row on desktop, giving
 *     an obvious "this scrolls" affordance next to the hidden scrollbar.
 * Trackpad, touch (via touch-action: pan-x on the container) and keyboard already
 * work; this fills the mouse gap left by the hidden scrollbar.
 */
export function HorizontalScroller({ className, children, showArrows = false }: HorizontalScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Recompute which arrows apply from the current scroll position. Only used
  // when arrows are shown, but cheap enough to always keep in sync.
  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    if (!showArrows) return;
    updateArrows();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [showArrows, updateArrows]);

  // Page by ~90% of the visible width. We animate scrollLeft ourselves with rAF
  // rather than scrollBy({behavior:"smooth"}) — the latter is a no-op in some
  // engines (and reduced-motion users get no movement) — assigning scrollLeft
  // works everywhere. We tick updateArrows() along the way so the enabled state
  // stays correct even where a programmatic scroll emits no "scroll" event.
  const page = useCallback(
    (dir: 1 | -1) => {
      const el = ref.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      const from = el.scrollLeft;
      const to = Math.max(0, Math.min(max, from + dir * el.clientWidth * 0.9));
      if (to === from) return;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        el.scrollLeft = to;
        updateArrows();
        return;
      }
      const start = performance.now();
      const duration = 350;
      const ease = (p: number) => 0.5 - Math.cos(p * Math.PI) / 2; // easeInOutSine
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        el.scrollLeft = from + (to - from) * ease(p);
        updateArrows();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [updateArrows],
  );

  // Wheel handling needs a NON-passive native listener so we can preventDefault
  // the page from scrolling vertically while the row scrolls horizontally.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el || e.deltaY === 0) return;
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      // At an edge, let the wheel scroll the page instead of trapping it.
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) > 4) {
      drag.current.moved = true;
      el.setPointerCapture(e.pointerId); // keep receiving moves outside the row
    }
    if (drag.current.moved) el.scrollLeft = drag.current.startLeft - dx;
  }

  function endDrag() {
    drag.current.active = false;
  }

  // A real drag shouldn't also trigger a card click (Request / View Profile).
  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  }

  const scroller = (
    <div
      ref={ref}
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );

  if (!showArrows) return scroller;

  return (
    <div className="group relative">
      {scroller}
      <ArrowButton side="left" onClick={() => page(-1)} disabled={!canLeft} />
      <ArrowButton side="right" onClick={() => page(1)} disabled={!canRight} />
    </div>
  );
}

function ArrowButton({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Scroll back" : "Scroll forward"}
      // Shown by default on desktop (touch/trackpad users swipe instead) so the
      // row's scrollability is discoverable at a glance; emphasised on row hover
      // and hidden entirely once that end is reached.
      className={[
        "absolute top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center",
        "h-9 w-9 rounded-full border border-hairline bg-white text-ink shadow-card",
        "opacity-80 transition hover:bg-canvas group-hover:opacity-100",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "lg:flex",
        side === "left" ? "left-1" : "right-1",
        disabled ? "pointer-events-none !opacity-0" : "",
      ].join(" ")}
    >
      <Icon width={18} height={18} />
    </button>
  );
}
