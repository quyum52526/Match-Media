import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheckIcon } from "@/components/ui/icons";
import { QuickFilter } from "./QuickFilter";

/**
 * Public landing hero — Brand v1.0 (Garnet / Ivory). Ivory canvas, Fraunces
 * display heading (Noto Serif Bengali in bn), Plus Jakarta Sans body. A quiet
 * trust badge, the new headline/subtext, and the Quick-Filter search.
 * Server component; the only interactive part is the nested client QuickFilter.
 */
export async function HomeHero() {
  const t = await getTranslations("Home");

  return (
    <section className="bg-canvas font-body antialiased">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        {/* Trust / consent badge */}
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface px-3 py-1 text-xs font-medium text-ink shadow-card">
          <ShieldCheckIcon width={14} height={14} className="text-success" />
          {t("hero.trustBadge")}
        </span>

        {/* Headline — Fraunces display */}
        <h1 className="mt-6 text-balance font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
          {t("hero.headline")}
        </h1>

        {/* Subtext */}
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base font-normal leading-relaxed text-muted sm:text-lg">
          {t("hero.subtext")}
        </p>

        {/* Quick-Filter */}
        <div className="mt-9">
          <QuickFilter />
        </div>

        {/* Secondary, low-emphasis path */}
        <p className="mt-5 text-sm font-normal text-muted">
          <Link
            href="/profiles/demo"
            className="font-medium text-primary underline-offset-4 transition-all duration-150 ease-in-out hover:underline"
          >
            {t("viewSample")}
          </Link>
        </p>
      </div>
    </section>
  );
}
