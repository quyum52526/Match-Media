import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheckIcon } from "@/components/ui/icons";
import { QuickFilter } from "./QuickFilter";

/**
 * Public landing hero for MatchMedia. Ivory surface, Charcoal type (weights kept
 * to regular/medium per the brand system), a Trust-Green consent badge, and the
 * Quick-Filter search bar. `antialiased` is set here too for crisp glyphs even if
 * a parent ever drops it. Server component — the only interactive part is the
 * nested client QuickFilter.
 */
export async function HomeHero() {
  const t = await getTranslations("Home");

  return (
    <section className="antialiased bg-ivory">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        {/* Consent / privacy badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-trustGreen/20 bg-trustGreen/5 px-3 py-1 text-xs font-medium text-trustGreen">
          <ShieldCheckIcon width={14} height={14} />
          {t("hero.trustBadge")}
        </span>

        {/* Headline — medium weight, tight tracking for presence without bold */}
        <h1 className="mt-5 text-balance text-4xl font-medium leading-tight tracking-tight text-charcoal sm:text-5xl">
          {t("hero.headline")}
        </h1>

        {/* Subtext */}
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base font-normal leading-relaxed text-charcoal/60 sm:text-lg">
          {t("hero.subtext")}
        </p>

        {/* Quick-Filter */}
        <div className="mt-8">
          <QuickFilter />
        </div>

        {/* Secondary, low-emphasis path */}
        <p className="mt-5 text-sm font-normal text-charcoal/50">
          <Link
            href="/profiles/demo"
            className="font-medium text-trustGreen underline-offset-4 transition-all duration-150 ease-in-out hover:underline"
          >
            {t("viewSample")}
          </Link>
        </p>
      </div>
    </section>
  );
}
