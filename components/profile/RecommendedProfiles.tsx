import { ProfileCard } from "./ProfileCard";
import { HorizontalScroller } from "./HorizontalScroller";
import { PhotoQuotaProvider } from "@/components/billing/PhotoQuota";
import { SparklesIcon } from "@/components/ui/icons";
import type { RecommendedProfile } from "@/lib/data/recommend";
import type { PhotoQuota } from "@/lib/data/billing";

interface RecommendedProfilesProps {
  /** Already ranked by match score (highest first); each carries its matchScore. */
  profiles: RecommendedProfile[];
  quota: PhotoQuota;
  title: string;
  subtitle?: string;
  /** Shown in place of the carousel when there are no recommendations yet. */
  emptyText: string;
}

/**
 * "Recommended for You" carousel shown between the FilterBar and the main
 * grid: a single horizontally-scrolling row of fixed-width cards, so the
 * section stays one row tall no matter how many recommendations there are.
 * Renders the same ProfileCard as the main grid (so behaviour stays identical)
 * inside its own PhotoQuotaProvider — the shared QuotaBanner stays with the
 * main grid to avoid a duplicate banner.
 *
 * When there are no recommendations (e.g. a sparse profile or narrow filters)
 * the section keeps its header and shows an empty state rather than vanishing.
 * The page only renders this for candidate viewers, so privileged accounts
 * (MEDIA/ADMIN, which have no profile) never see the empty state.
 */
export function RecommendedProfiles({
  profiles,
  quota,
  title,
  subtitle,
  emptyText,
}: RecommendedProfilesProps) {
  const isEmpty = profiles.length === 0;

  return (
    // Light-gray, bordered panel so the whole "Recommended" block reads as a
    // distinct "featured" surface, clearly separated from the plain (ivory-page)
    // "Browse Profiles" grid below it. Uses default Tailwind grays — the custom
    // brand tokens can't take an /opacity modifier, but gray-50/gray-200 render
    // as intended. Scoped entirely to this section — the grid is untouched.
    <section className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
          <SparklesIcon width={16} height={16} />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink/60">{subtitle}</p>}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline bg-white py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <SparklesIcon width={20} height={20} />
          </span>
          <p className="max-w-sm text-sm text-ink/60">{emptyText}</p>
        </div>
      ) : (
        <PhotoQuotaProvider initial={quota}>
          {/* Horizontal carousel — one row, scrollbar hidden. HorizontalScroller
              adds mouse drag + wheel scrolling (browsers don't do either natively
              on an overflow row) and, via showArrows, floating Prev/Next buttons
              on desktop; touch-action: pan-x handles touch devices.

              Card width is fluid, not fixed, so exactly 5 fit across on desktop
              at any width: with gap-4 (1rem) the 4 inner gaps total 4rem, so each
              card is (100% - 4rem) / 5 = 20% - 0.8rem. Narrower breakpoints step
              down to 3-up / ~1.5-up so cards never get too small. */}
          <HorizontalScroller
            showArrows
            className="scrollbar-hide flex w-full flex-nowrap gap-4 overflow-x-auto pb-2 [touch-action:pan-x] cursor-grab select-none active:cursor-grabbing"
          >
            {profiles.map((profile) => (
              // Ring + soft shadow lift the white card off the gray panel so its
              // edge stays legible (accessibility contrast) — added on the
              // wrapper, never on the shared ProfileCard the grid also uses.
              <div
                key={profile.id}
                className="w-[66%] shrink-0 rounded-2xl shadow-sm ring-1 ring-black/5 sm:w-[calc(33.333%_-_0.667rem)] lg:w-[calc(20%_-_0.8rem)]"
              >
                <ProfileCard profile={profile} matchScore={profile.matchScore} />
              </div>
            ))}
          </HorizontalScroller>
        </PhotoQuotaProvider>
      )}
    </section>
  );
}
