import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/constants/labels";
import {
  ShieldCheckIcon,
  StarIcon,
  LockIcon,
  MapPinIcon,
} from "@/components/ui/icons";
import type { ShowcaseProfile } from "./showcaseData";

/** Localized strings the card needs (resolved by the parent server component). */
export interface CardLabels {
  premium: string;
  mobileVerified: string;
  member: string;
  photoPrivate: string;
}

/**
 * Atomic profile card for the homepage showcase.
 * - Privacy-default: the photo area is a frosted/blurred surface with a lock —
 *   nothing is revealed until a viewer earns access in the real funnel.
 * - White card on the Ivory grid, soft shadow, snappy hover lift (-translate-y-1
 *   + shadow), all via Tailwind transitions.
 * - Verify-Green "Mobile-verified" + Muted-Gold "Premium" badges where applicable.
 */
export function ProfileShowcaseCard({
  profile,
  locale,
  hue,
  labels,
}: {
  profile: ShowcaseProfile;
  locale: string;
  hue: string;
  labels: CardLabels;
}) {
  const displayName = profile.nameHidden || !profile.name ? labels.member : profile.name;

  return (
    <Link
      href="/profiles/demo"
      className="group block w-44 shrink-0 snap-start sm:w-48"
    >
      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-charcoal/5 transition-all duration-150 ease-in-out group-hover:-translate-y-1 group-hover:shadow-lg">
        {/* Privacy-default photo area */}
        <div className={`relative aspect-[4/5] overflow-hidden bg-gradient-to-br ${hue}`}>
          {/* Frosted layer blurs the surface behind it (privacy-default) */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[6px]" />

          {/* Lock + hint */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-charcoal/70">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 shadow-sm">
              <LockIcon width={16} height={16} />
            </span>
            <span className="text-[10px] font-medium">{labels.photoPrivate}</span>
          </div>

          {/* Premium badge (Muted Gold) */}
          {profile.isPremium && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
              <StarIcon width={11} height={11} />
              {labels.premium}
            </span>
          )}

          {/* Mobile-verified badge (Verify Green) */}
          {profile.isMobileVerified && (
            <span
              title={labels.mobileVerified}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-verifyGreen px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
            >
              <ShieldCheckIcon width={11} height={11} />
              <span className="sr-only sm:not-sr-only">{labels.mobileVerified}</span>
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-medium text-charcoal">{displayName}</p>
          <p className="text-xs text-charcoal/60">
            <span className="font-sans">{profile.age}</span>
            {" · "}
            {localize(profile.profession, locale)}
          </p>
          <p className="flex items-center gap-1 text-xs text-charcoal/50">
            <MapPinIcon width={12} height={12} />
            <span className="truncate">{localize(profile.district, locale)}</span>
          </p>
        </div>
      </article>
    </Link>
  );
}
