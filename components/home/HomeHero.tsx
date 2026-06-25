import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { QuickFilter } from "./QuickFilter";
import { Reveal } from "./Reveal";
import { HeroMarquee } from "./HeroMarquee";
import type { ShowcaseProfile } from "@/lib/data/showcase";

/**
 * Public landing hero — Brand v1.0. Uses a single static background image
 * (public/hero-bg.jpeg) for the canvas. A soft, neutral Ivory scrim sits over
 * the photo so the dark foreground text stays fully legible while the image
 * remains clearly visible. Content cascades in (staggered Stripe-style reveal);
 * an infinite mini-profile marquee runs along the bottom edge.
 * Server component — interactive bits (QuickFilter, Reveal) are nested clients.
 */
export async function HomeHero({ marqueeProfiles }: { marqueeProfiles: ShowcaseProfile[] }) {
  const t = await getTranslations("Home");

  return (
    <section className="relative flex min-h-[80vh] flex-col overflow-hidden bg-[url('/hero-bg.jpeg')] bg-cover bg-center bg-no-repeat font-body antialiased">
      {/* Legibility scrim over the photo (neutral Ivory tint, not a brand gradient) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "rgba(251, 247, 242, 0.55)" }}
      />

      {/* Centered content (staggered reveal) */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        {/* Trust / consent badge */}
        <Reveal delay={0}>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface px-3 py-1 text-xs font-medium text-ink shadow-card">
            <ShieldCheck size={14} className="text-success" />
            {t("hero.trustBadge")}
          </span>
        </Reveal>

        {/* Headline — Fraunces display */}
        <Reveal delay={80} className="mt-6">
          <h1 className="text-balance font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            {t("hero.headline")}
          </h1>
        </Reveal>

        {/* Subtext */}
        <Reveal delay={160} className="mt-4">
          <p className="mx-auto max-w-xl text-pretty text-base font-normal leading-relaxed text-muted sm:text-lg">
            {t("hero.subtext")}
          </p>
        </Reveal>

        {/* Quick-Filter */}
        <Reveal delay={240} className="mt-9 w-full">
          <QuickFilter />
        </Reveal>

        {/* Secondary, low-emphasis path */}
        <Reveal delay={320} className="mt-5">
          <p className="text-sm font-normal text-muted">
            <Link
              href="/profiles/demo"
              className="font-medium text-primary underline-offset-4 transition-all duration-150 ease-in-out hover:underline"
            >
              {t("viewSample")}
            </Link>
          </p>
        </Reveal>
      </div>

      {/* Infinite mini-profile marquee at the bottom edge of the hero */}
      <div className="relative z-10 pb-10">
        <HeroMarquee profiles={marqueeProfiles} />
      </div>
    </section>
  );
}
