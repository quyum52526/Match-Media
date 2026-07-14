"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LockIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
  UsersIcon,
  BriefcaseIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { requestPhotoAccess as requestPhotoAccessAction } from "@/lib/actions/funnel";
import { usePhotoQuota } from "@/components/billing/PhotoQuota";
import { localize } from "@/lib/constants/labels";
import { toMatchPercent } from "@/lib/matching/score";
import { MATCH_BADGE_MIN_PERCENT } from "@/lib/matching/weights";
import type { ProfileSummary, PhotoAccessState } from "./types";

interface ProfileCardProps {
  profile: ProfileSummary;
  /**
   * Weighted match score (0..MAX_MATCH_SCORE). Passed ONLY by the "Recommended
   * for You" carousel — when present the card shows a "% Match" badge. The main
   * grid omits it, so the badge never appears there.
   */
  matchScore?: number;
}

function isRevealed(profile: ProfileSummary, state: PhotoAccessState): boolean {
  return profile.primaryImagePrivacy === "PUBLIC" || state === "APPROVED";
}

export function ProfileCard({ profile, matchScore }: ProfileCardProps) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const [isSubmitting, startTransition] = useTransition();
  const quotaCtx = usePhotoQuota();

  // Recommendation cards carry a match score; the grid does not. The badge is
  // hidden below MATCH_BADGE_MIN_PERCENT so weak matches don't show a low number.
  const matchPercent = matchScore != null ? toMatchPercent(matchScore) : null;
  const showMatchBadge =
    matchPercent != null && matchPercent >= MATCH_BADGE_MIN_PERCENT;

  // Photo-access state comes from the server; the action + revalidate refresh it.
  const revealed = isRevealed(profile, profile.photoAccess);
  const pending = profile.photoAccess === "PENDING";

  // A brand-new request (no prior row) is the only kind the daily cap blocks.
  const isNewRequest = profile.photoAccess === "NONE";
  const blockedByLimit =
    !!quotaCtx &&
    !quotaCtx.quota.unlimited &&
    isNewRequest &&
    quotaCtx.quota.remaining <= 0;

  function requestPhoto() {
    if (blockedByLimit) return;
    startTransition(async () => {
      const result = await requestPhotoAccessAction(profile.id);
      quotaCtx?.applyResult(result);
    });
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Photo — real image when available, decorative gradient otherwise.
          When gated, the server already supplied the pre-blurred teaser; the
          CSS blur is harmless defense-in-depth. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/5">
        {profile.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.imageUrl}
            alt=""
            className={
              "h-full w-full object-cover" + (revealed ? "" : " blur-2xl scale-110")
            }
          />
        ) : (
          <div
            className={
              "h-full w-full bg-gradient-to-br from-primary/30 via-success/20 to-accent/20" +
              (revealed ? "" : " blur-2xl scale-110")
            }
            aria-hidden
          />
        )}

        {!revealed && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/20">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink">
              <LockIcon width={20} height={20} />
            </span>
          </div>
        )}

        {profile.isVerified && (
          <span className="absolute left-2.5 top-2.5">
            <Badge
              variant="verified"
              className="bg-white/90"
              icon={<ShieldCheckIcon width={13} height={13} />}
            >
              {t("verified")}
            </Badge>
          </span>
        )}

        {/* Top-right stack: the "% Match" badge (recommendations only) sits
            above the VIP badge so the two never overlap. */}
        {(showMatchBadge || profile.isPro) && (
          <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1.5">
            {showMatchBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm ring-1 ring-primary/15 backdrop-blur-sm">
                <SparklesIcon width={12} height={12} className="text-accent" />
                {t("card.matchBadge", { n: String(matchPercent) })}
              </span>
            )}
            {profile.isPro && (
              <Badge
                variant="gold"
                className="bg-accent text-white"
                icon={<StarIcon width={13} height={13} />}
              >
                {t("vip")}
              </Badge>
            )}
          </div>
        )}

        {profile.managedBy === "GUARDIAN" && (
          <span className="absolute bottom-2.5 right-2.5">
            <Badge
              variant="neutral"
              className="bg-sky-50 text-sky-700 border border-sky-200"
              icon={<UsersIcon width={13} height={13} />}
            >
              {t("managedByParents")}
            </Badge>
          </span>
        )}
        {profile.managedBy === "MEDIA" && (
          <span className="absolute bottom-2.5 right-2.5">
            <Badge
              variant="neutral"
              className="bg-violet-50 text-violet-700 border border-violet-200"
              icon={<BriefcaseIcon width={13} height={13} />}
            >
              {t("managedByAgency")}
            </Badge>
          </span>
        )}

        {pending && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">
            <ClockIcon width={13} height={13} />
            {t("photo.waiting")}
          </span>
        )}
      </div>

      {/* Identity */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-ink">
            {profile.displayName}
          </h3>
          {profile.nameHidden && (
            <LockIcon
              width={13}
              height={13}
              className="shrink-0 text-ink/40"
            />
          )}
        </div>

        <p className="text-xs text-ink/60">
          {t.rich("card.ageLocation", {
            age: String(profile.age),
            upazila: localize(profile.upazila, locale),
            district: localize(profile.district, locale),
            n: (chunks) => (
              <span className="font-body font-semibold text-ink/80">
                {chunks}
              </span>
            ),
          })}
        </p>

        {/* Trust score mini bar */}
        <div className="mt-auto space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink/35">
              Trust
            </span>
            <span className="text-[10px] font-semibold text-success/80">
              {profile.trustScore}%
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${profile.trustScore}%` }}
            />
          </div>
        </div>

        {/* Actions: Request + View Profile */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={requestPhoto}
            disabled={pending || revealed || isSubmitting || blockedByLimit}
            title={blockedByLimit ? t("photo.quota.limitReachedTitle") : undefined}
          >
            {pending
              ? t("card.requested")
              : blockedByLimit
                ? t("photo.quota.cardButton")
                : t("card.request")}
          </Button>
          <Link href={`/profiles/${profile.id}`} className="flex-1">
            <Button variant="outline" size="sm" fullWidth>
              {t("card.viewProfile")}
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
