import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Reusable two-column feature block for the homepage: an icon + title +
 * description on one side, and a clickable stack of three overlapping profile
 * cards on the other. `imagePosition` decides which side the card stack sits on
 * (desktop only — on mobile it always stacks text-over-cards). Brand tokens map
 * to the spec's hex: primary = Garnet #8C2F4A, accent = Champagne #C8A24B.
 *
 * NOTE: this renders just the two-column grid (no full-width band / bg / max-w /
 * padding) — the parent container on the homepage owns bounds + spacing.
 *
 * Stripe-style: the only motion is a smooth `group-hover` spread of the cards
 * (transition-all / ease-out) to signal the column is clickable.
 */
export interface StackedFeatureSectionProps {
  title: string;
  description: string;
  icon: ReactNode; // a lucide-react icon element, e.g. <Sparkles size={24} />
  imagePosition: "left" | "right";
  redirectLink: string;
  /** Dummy name on the top card's floating badge. */
  badgeName?: string;
}

export function StackedFeatureSection({
  title,
  description,
  icon,
  imagePosition,
  redirectLink,
  badgeName = "Faisal Ansari",
}: StackedFeatureSectionProps) {
  const cardsLeft = imagePosition === "left";

  return (
    <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
      {/* ---------- Text + icon ---------- */}
      <div
        className={`flex flex-col items-center text-center md:items-start md:text-left ${
          cardsLeft ? "md:order-2" : "md:order-1"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-card">
          {icon}
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-accent sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-base font-normal leading-relaxed text-muted">
          {description}
        </p>
      </div>

      {/* ---------- Clickable card stack ---------- */}
      <Link
        href={redirectLink}
        aria-label={title}
        className={`group relative flex h-[350px] w-full cursor-pointer items-center justify-center ${
          cardsLeft ? "md:order-1" : "md:order-2"
        }`}
      >
        {/* Card 1 — bottom, rotated left */}
        <div className="absolute h-[300px] w-[220px] rounded-2xl border-2 border-primary bg-surface shadow-lg transition-all duration-300 ease-out z-10 -translate-x-6 rotate-[-8deg] group-hover:-translate-x-14 group-hover:rotate-[-12deg]" />

        {/* Card 2 — middle, rotated right */}
        <div className="absolute h-[300px] w-[220px] rounded-2xl border-2 border-primary bg-surface shadow-lg transition-all duration-300 ease-out z-20 translate-x-4 rotate-[6deg] group-hover:translate-x-12 group-hover:rotate-[10deg]" />

        {/* Card 3 — top, straight (the "profile") */}
        <div className="absolute z-30 h-[300px] w-[220px] overflow-hidden rounded-2xl border-2 border-primary shadow-2xl transition-all duration-300 ease-out group-hover:-translate-y-2">
          {/* Simulated profile photo */}
          <div className="h-full w-full bg-gradient-to-br from-accent/40 via-canvas to-primary/30" />

          {/* Floating verified name pill */}
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-card">
            {badgeName}
            <BadgeCheck size={14} className="text-success" />
          </span>
        </div>
      </Link>
    </div>
  );
}
