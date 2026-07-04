"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface TermsSection {
  /** Stable anchor id, shared across locales (e.g. "privacy"). */
  id: string;
  heading: string;
  body: string;
}

/**
 * Single-page Terms document: anchor-link navigation with a scrollspy.
 *
 * Desktop: sticky vertical sidebar (1/4) beside the content (3/4).
 * Mobile: the same links collapse into a sticky horizontal pill bar at the
 * top so navigation never covers the content.
 *
 * The scrollspy uses an IntersectionObserver whose rootMargin defines a
 * horizontal "reading band" near the top of the viewport — whichever section
 * intersects that band is highlighted. Smooth sliding comes from the global
 * `html { scroll-behavior: smooth }` (globals.css).
 */
export function TermsBody({ sections }: { sections: TermsSection[] }) {
  const [activeId, setActiveId] = useState<string | undefined>(sections[0]?.id);
  // While a click-initiated smooth scroll is animating, the spy stays quiet so
  // the clicked link keeps its highlight — vital on short pages where a bottom
  // section can never physically reach the reading band. User scrolling after
  // the lock expires hands control back to the spy.
  const spyLockUntil = useRef(0);

  useEffect(() => {
    // Two sections can share the reading band at once (short sections, or
    // mid-animation), so "last event wins" misfires. Track how many PIXELS of
    // each section sit inside the band and highlight the largest — absolute
    // height, not intersectionRatio, so long sections aren't out-voted by
    // short fully-visible neighbours.
    const visiblePx = new Map<string, number>();
    const lastId = sections[sections.length - 1]?.id;
    // At the very bottom of the page the last section wins outright — it may
    // be too low to ever reach the reading band. Checked in BOTH callbacks:
    // observer batches arrive after scroll events and would stomp it otherwise.
    const atPageBottom = () =>
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2;

    const observer = new IntersectionObserver(
      (entries) => {
        // ALWAYS record entries — each threshold crossing is reported once,
        // so skipping them while the click-lock is active would leave the
        // map permanently stale.
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.spyId;
          if (!id) continue;
          visiblePx.set(id, entry.isIntersecting ? entry.intersectionRect.height : 0);
        }
        if (Date.now() < spyLockUntil.current) return;
        if (atPageBottom() && lastId) {
          setActiveId(lastId);
          return;
        }
        let best: string | undefined;
        let bestPx = 0;
        for (const section of sections) {
          const px = visiblePx.get(section.id) ?? 0;
          if (px > bestPx) {
            best = section.id;
            bestPx = px;
          }
        }
        // Nothing in the band (gap between sections): keep the previous one.
        if (best) setActiveId(best);
      },
      // Band between 15% and 45% from the top: a section becomes active as
      // its content crosses the reading position, not the viewport edge.
      { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    // The anchor id lives on the <h2>; the spy observes the whole <section>
    // (via data attribute) so visibility reflects the full text, not just
    // the heading line.
    for (const section of sections) {
      const el = document.querySelector(`[data-spy-id="${section.id}"]`);
      if (el) observer.observe(el);
    }

    function onScroll() {
      if (Date.now() < spyLockUntil.current || !lastId) return;
      if (atPageBottom()) setActiveId(lastId);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  const links = sections.map((section) => {
    const active = section.id === activeId;
    return (
      <li key={section.id} className="shrink-0">
        <a
          href={`#${section.id}`}
          onClick={() => {
            setActiveId(section.id);
            spyLockUntil.current = Date.now() + 1000;
          }}
          aria-current={active ? "true" : undefined}
          className={cn(
            "block whitespace-nowrap rounded-pill px-3 py-2 text-sm transition-colors lg:whitespace-normal lg:rounded-lg",
            active
              ? "bg-primary/10 font-semibold text-primary"
              : "text-ink/70 hover:bg-primary/5 hover:text-primary",
          )}
        >
          {section.heading}
        </a>
      </li>
    );
  });

  return (
    <>
      {/* Mobile: sticky horizontal nav — sits above the content, never over it. */}
      <nav
        aria-label="Sections"
        className="sticky top-0 z-10 -mx-4 mt-6 border-b border-hairline bg-canvas/95 px-4 py-2 backdrop-blur lg:hidden"
      >
        <ul className="scrollbar-hide flex gap-1 overflow-x-auto">{links}</ul>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-4">
        {/* Desktop: sticky vertical sidebar (1/4). */}
        <aside className="hidden lg:col-span-1 lg:block lg:self-start lg:sticky lg:top-24">
          <nav aria-label="Sections">
            <ul className="space-y-1">{links}</ul>
          </nav>
        </aside>

        {/* Content (3/4) — one long scrollable document. */}
        <Card className="lg:col-span-3">
          <CardBody className="divide-y divide-hairline !py-0">
            {sections.map((section) => (
              <section
                key={section.id}
                data-spy-id={section.id}
                className="py-8"
              >
                {/* The <h2> carries the anchor id (nav hrefs point here). */}
                <h2
                  id={section.id}
                  className="scroll-mt-24 text-base font-semibold text-ink"
                >
                  {section.heading}
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink/80">
                  {section.body}
                </p>
              </section>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
