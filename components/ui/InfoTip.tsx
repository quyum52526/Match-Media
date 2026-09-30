"use client";

import { Info } from "lucide-react";

/**
 * Two-part info tooltip, split so each piece has a single positioning job:
 *
 *   <InfoTipButton>  the visible (i) affordance, pinned into a card corner
 *   <InfoTipBubble>  the floating description, centred on the CARD
 *
 * They are separate because they anchor to different boxes. Bundling them made
 * the bubble anchor to the 14px button, which put it in the card's top-right
 * corner instead of centred, and meant only the button could open it.
 *
 * Both are CONTROLLED: the parent owns `open`, so hovering or focusing anywhere
 * on the card can drive the tooltip, not just the button. See RegisterForm.
 *
 * Dependency-free on purpose — this project has no Radix/shadcn stack, and one
 * tooltip is not worth adopting a second component system. Swapping in a
 * library tooltip means replacing this file and keeping the same two props.
 */

/** The (i) trigger. Pin it with `className` (e.g. "absolute right-1 top-1"). */
export function InfoTipButton({
  label,
  open,
  onPress,
  describedById,
  className,
}: {
  /** Accessible name, e.g. "About Personal". */
  label: string;
  open: boolean;
  /**
   * Press handler. Opens the tooltip; it does NOT toggle, because focus fires
   * before click and a toggle would close what focus just opened. The parent
   * decides how it closes (hover-out, timer, Escape).
   */
  onPress: () => void;
  /** Bubble id, linked while open so screen readers announce the description. */
  describedById: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-describedby={open ? describedById : undefined}
      onClick={(e) => {
        // This button lives inside the <label> that owns the card's radio, so a
        // bare click would also select the card. Both calls are required: one
        // stops the label's implicit activation, the other stops the bubble.
        e.preventDefault();
        e.stopPropagation();
        onPress();
      }}
      className={cnLocal(
        "z-10 rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        open ? "text-primary" : "text-ink/35 hover:text-primary",
        className,
      )}
    >
      <Info size={14} aria-hidden="true" />
    </button>
  );
}

/**
 * The floating description. Renders below its anchor with an upward arrow.
 *
 * Below, not above: the selector sits near the top of the signup form, so an
 * upward bubble on the first row would push past the form card. Downward, a
 * row-1 tooltip simply floats over row 2 — which is what a tooltip should do.
 *
 * `pointer-events-none` keeps the bubble from stealing the hover that is
 * keeping it open (it overlaps the cards below it), which would make it flicker.
 * z-50 puts it above every sibling card, including the selected one.
 */
export function InfoTipBubble({
  id,
  text,
  className,
}: {
  id: string;
  text: string;
  className?: string;
}) {
  return (
    <span
      id={id}
      role="tooltip"
      className={cnLocal(
        "pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-44 -translate-x-1/2",
        "rounded-lg bg-ink px-3 py-2 text-left text-[11px] font-normal leading-snug text-white shadow-lg",
        className,
      )}
    >
      {/* Arrow: a rotated corner of the same fill, tucked under the top edge. */}
      <span
        aria-hidden="true"
        className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 rounded-[2px] bg-ink"
      />
      {text}
    </span>
  );
}

/** Local join helper — avoids importing lib/utils into a leaf UI primitive. */
function cnLocal(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
