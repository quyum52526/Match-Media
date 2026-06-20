import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/constants/labels";
import { formatDate } from "@/lib/utils";
import { LockIcon, ShieldCheckIcon, EyeIcon } from "@/components/ui/icons";
import type { RequestPerson } from "@/components/requests/types";
import type { ViewerEntry } from "@/lib/data/viewers";

/**
 * Grid of people who recently viewed the current user's profile. Photos stay
 * blurred and `nameHidden` viewers show the hidden-name placeholder, matching
 * the privacy model used across the funnel. Entries within the 24h delayed-
 * reveal window render as anonymous locked cards (no identity is sent for
 * them). Renders an empty state when there are none.
 */
export async function WhoViewedMe({ viewers }: { viewers: ViewerEntry[] }) {
  const t = await getTranslations("Viewers");
  const locale = await getLocale();

  if (viewers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/15 bg-white py-12 text-center">
        <EyeIcon width={28} height={28} className="text-charcoal/30" />
        <p className="text-sm text-charcoal/50">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {viewers.map((entry, i) =>
        entry.locked ? (
          <LockedCard
            key={`locked-${i}`}
            title={t("locked")}
            unlocksLabel={t("unlocksIn", {
              n: String(hoursUntil(entry.revealAt)),
            })}
          />
        ) : (
          <RevealedCard
            key={entry.person!.id}
            person={entry.person!}
            locale={locale}
            viewedLabel={t("viewedOn", { date: formatDate(entry.viewedAt) })}
          />
        ),
      )}
    </ul>
  );
}

/** Whole hours (min 1) until an ISO instant, for a static "Unlocks in Nh". */
function hoursUntil(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso) - Date.now();
  return Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
}

/** Anonymous teaser shown during the 24h delay — carries no identity. */
function LockedCard({
  title,
  unlocksLabel,
}: {
  title: string;
  unlocksLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white p-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-charcoal/5">
        <div
          className="h-full w-full scale-110 bg-gradient-to-br from-charcoal/25 via-charcoal/15 to-charcoal/25 blur-md"
          aria-hidden
        />
        <span className="absolute inset-0 flex items-center justify-center text-charcoal/60">
          <LockIcon width={16} height={16} />
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-charcoal/70">
          {title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-gold">
          <LockIcon width={12} height={12} />
          {unlocksLabel}
        </p>
      </div>
    </li>
  );
}

/** Fully revealed viewer (24h elapsed) — links to their profile. */
function RevealedCard({
  person,
  locale,
  viewedLabel,
}: {
  person: RequestPerson;
  locale: string;
  viewedLabel: string;
}) {
  return (
    <li>
      <Link
        href={`/profiles/${person.id}`}
        className="flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 transition-colors hover:border-charcoal/20"
      >
        {/* Blurred mini thumbnail (privacy-first) */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-charcoal/5">
          <div
            className="h-full w-full scale-110 bg-gradient-to-br from-trustGreen/30 via-verifyGreen/20 to-gold/20 blur-md"
            aria-hidden
          />
          <span className="absolute inset-0 flex items-center justify-center text-charcoal/70">
            <LockIcon width={16} height={16} />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-charcoal">
              {person.displayName}
            </span>
            {person.nameHidden && (
              <LockIcon
                width={12}
                height={12}
                className="shrink-0 text-charcoal/40"
              />
            )}
            {person.isVerified && (
              <ShieldCheckIcon
                width={14}
                height={14}
                className="shrink-0 text-verifyGreen"
              />
            )}
          </div>
          <p className="text-xs text-charcoal/60">
            <span className="font-sans font-medium text-charcoal/80">
              {person.age}
            </span>{" "}
            · {localize(person.upazila, locale)},{" "}
            {localize(person.district, locale)}
          </p>
          <p className="mt-0.5 text-xs text-charcoal/40">{viewedLabel}</p>
        </div>
      </Link>
    </li>
  );
}
