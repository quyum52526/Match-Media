import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import DolnaHero from "@/components/DolnaHero";
import { Container } from "@/components/ui/Container";
import { QuickFilter } from "./QuickFilter";
import { Reveal } from "./Reveal";
import { HeroMarquee } from "./HeroMarquee";
import type { ShowcaseProfile } from "@/lib/data/showcase";

/**
 * Public landing hero — Brand v1.0. DolnaHero paints an animated dolna
 * (swing) illustration behind the content; it's pointer-events:none so the
 * search bar underneath stays fully clickable. Content cascades in
 * (staggered Stripe-style reveal). The mini-profile marquee is a separate
 * strip below the hero, not overlapping it, so it never covers the artwork.
 * Server component — interactive bits (QuickFilter, Reveal) are nested clients.
 */
export async function HomeHero({ marqueeProfiles }: { marqueeProfiles: ShowcaseProfile[] }) {
  const t = await getTranslations("Home");

  return (
    <>
    <section className="relative min-h-[clamp(603px,calc(92vh-97px),843px)] flex flex-col overflow-hidden font-body antialiased">
      <DolnaHero />

      <Container
        as="div"
        className="relative z-10 flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24"
      >
        {/* Trust / consent badge */}
        <Reveal delay={0}>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface px-3 py-1 text-xs font-medium text-ink shadow-card">
            <ShieldCheck size={14} className="text-success" />
            {t("hero.trustBadge")}
          </span>
        </Reveal>

        {/* Headline — Fraunces display. sm:5xl is untouched (that range's
            content width, 608–992px, hasn't changed from before). The jump
            to 7xl only lands at lg (1024px+), close to where the container
            actually finishes widening (992px → 1120px, capped by Container's
            max-w-6xl) — a mid-step at md:6xl was tried and dropped: at 768px
            the box is still ~736px (same as before this change), and 60px
            text doesn't fit even the first clause on one line there, which
            pushed the headline to three lines instead of two. */}
        <Reveal delay={80} className="mt-6">
          <h1 className="text-balance font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl lg:text-7xl">
            {t("hero.headline")}
          </h1>
        </Reveal>

        {/* Subtext */}
        <Reveal delay={160} className="mt-4">
          <p className="mx-auto max-w-2xl text-pretty text-base font-normal leading-relaxed text-muted sm:text-lg lg:text-xl">
            {t("hero.subtext")}
          </p>
        </Reveal>

        {/* Quick-Filter */}
        <Reveal delay={240} className="mt-9 w-full">
          <QuickFilter />
        </Reveal>

        {/* Secondary, low-emphasis path. Sits directly on the DolnaHero
            artwork, which can be anything from pale background to the
            saree's gold depending on where the crop/zoom math lands — a
            plain text-primary link measured as low as 3.1:1 against the
            gold. The rgba() scrim (not a Tailwind /opacity class: this
            app's color tokens have no <alpha-value> slot, so those
            modifiers silently no-op) plus primary-dark text holds ≥5.7:1
            against the darkest pixel found anywhere in the artwork, by
            construction — see conversation for the pixel sampling. */}
        <Reveal delay={320} className="mt-5">
          <p className="text-sm font-normal text-muted">
            <Link
              href="/profiles/demo"
              className="inline-block rounded-[6px] px-2.5 py-1 font-medium text-primary-dark underline-offset-4 transition-all duration-150 ease-in-out hover:underline"
              style={{ backgroundColor: "rgba(251,247,242,0.85)" }}
            >
              {t("viewSample")}
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>

    {/* Infinite mini-profile marquee — its own strip below the hero */}
    <div className="relative pb-10">
      <HeroMarquee profiles={marqueeProfiles} />
    </div>
    </>
  );
}
