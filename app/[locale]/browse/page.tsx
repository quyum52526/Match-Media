import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { ProfileGridSkeleton } from "@/components/profile/ProfileGridSkeleton";
import { BrowsePagination } from "@/components/profile/BrowsePagination";
import { RecommendedProfiles } from "@/components/profile/RecommendedProfiles";
import { FilterBar } from "@/components/profile/FilterBar";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { Button } from "@/components/ui/Button";
import { SearchIcon } from "@/components/ui/icons";
import {
  BROWSE_PAGE_SIZE,
  getBrowseProfiles,
  type SearchFilters,
} from "@/lib/data/profiles";
import { getRecommendedProfiles } from "@/lib/data/recommend";
import { getProfileCompletion } from "@/lib/data/profileCompletion";
import { getPhotoRequestQuota, getProfileViewQuota } from "@/lib/data/billing";
import { FREE_DAILY_LIMIT } from "@/lib/constants/plans";
import { QuotaNote } from "@/components/billing/PhotoQuota";
import { getViewerIdOrGuest } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { GUEST_VIEWER_ID } from "@/lib/guest";
import { prisma } from "@/lib/prisma";
import { NO_INDEX } from "@/lib/seo/metadata";
import { isAdminRole } from "@/lib/rbac";

// Member-only: also robots-disallowed in app/robots.ts.
export const metadata: Metadata = {
  title: "Browse",
  ...NO_INDEX,
};

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

function num(v: string | string[] | undefined): number | undefined {
  const s = str(v);
  const n = s ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const { viewerId, isGuest } = await getViewerIdOrGuest(`/${locale}/login`);
  const t = await getTranslations("Browse");

  // Guest preview uses a sentinel id for personalization-free reads only —
  // see lib/guest.ts for why that's safe here but never for a write path.
  const effectiveViewerId = viewerId ?? GUEST_VIEWER_ID;

  const viewer = isGuest
    ? null
    : await prisma.user.findUnique({
        where: { id: effectiveViewerId },
        select: { role: true, accountCategory: true },
      });
  const viewerRole = viewer?.role ?? null;
  const viewerCategory = viewer?.accountCategory ?? null;
  const isPrivilegedViewer =
    isAdminRole(viewerRole) || viewerCategory === "MEDIA" || viewerCategory === "PARENTS";

  // Optional hard gate (off by default). Applies to signed-in members only:
  // a guest has no profile to verify, and bouncing them here would break the
  // "Explore as Guest" entry point that the whole preview mode exists for.
  if (!isGuest && await isFeatureEnabled("REQUIRE_VERIFICATION_TO_BROWSE")) {
    const ownProfile = await prisma.profile.findUnique({
      where: { userId: effectiveViewerId },
      select: { isVerified: true },
    });
    // Admins are exempt — they have no candidate profile to verify.
    if (!isAdminRole(viewerRole) && !ownProfile?.isVerified) {
      redirect(locale === "en" ? "/en/profile/verify" : "/profile/verify");
    }
  }

  const filters: SearchFilters = {
    gender: str(sp.gender),
    minAge: num(sp.minAge),
    maxAge: num(sp.maxAge),
    district: str(sp.district),
    upazila: str(sp.upazila),
    religion: str(sp.religion),
    sect: str(sp.sect),
    profession: str(sp.profession),
    education: str(sp.education),
    maritalStatus: str(sp.maritalStatus),
    minHeight: str(sp.minHeight),
    maxHeight: str(sp.maxHeight),
  };
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  // `page` is not a filter — it must not count toward hasFilters, or the
  // "no matches, clear your filters" empty state would fire on a bare page 2.
  const page = num(sp.page) ?? 1;

  // A guest has no account to fetch quotas/completion for, so these stay
  // static rather than hitting the DB. `unlimited: true` here only suppresses
  // the "N left today" / "limit reached" copy (which would be misleading —
  // guests haven't "used" a free-tier allowance) — it grants no real access:
  // every gated button still runs through the AuthGateModal (`gate()`) before
  // the quota value is ever consulted, so nothing actually unmetered slips through.
  const guestQuota = { unlimited: true, remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };

  // The paginated feed is deliberately NOT in this Promise.all: it is awaited
  // inside <BrowseFeed>, below a Suspense boundary, so paging shows a skeleton
  // instead of blocking the whole page (filters, quota banner and the
  // recommendations strip stay on screen while the next page loads).
  const [recommended, completion, quota, viewQuota] = await Promise.all([
    // Recommendations are shown to every viewer, guests included (guests get
    // the gender-agnostic fallback set, same as a profile-less MEDIA/ADMIN).
    getRecommendedProfiles(effectiveViewerId, filters, isAdminRole(viewerRole)),
    // MEDIA/ADMIN users and guests have no personal profile to score.
    isPrivilegedViewer || isGuest ? Promise.resolve(null) : getProfileCompletion(effectiveViewerId),
    isGuest ? Promise.resolve(guestQuota) : getPhotoRequestQuota(effectiveViewerId),
    isGuest ? Promise.resolve(guestQuota) : getProfileViewQuota(effectiveViewerId),
  ]);

  return (
    <Container className="py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink/60">{t("subtitle")}</p>
      </header>

      <QuotaNote quota={viewQuota} namespace="Browse.viewQuota" variant="banner" />

      {completion && completion.score < 100 && (
        <div className="mb-6">
          <ProfileCompletionBanner completion={completion} />
        </div>
      )}

      <div className="mb-6">
        <FilterBar />
      </div>

      {/* Recommendations are shown to every authenticated viewer, admins
          included. When there are no scored matches the recommender returns a
          "fallback" set (most-complete members) — we relabel the subtitle so
          it's honest, and only fall back to the text empty state when even that
          is empty (no candidates at all). */}
      <RecommendedProfiles
        profiles={recommended.profiles}
        quota={quota}
        title={t("recommended.title")}
        subtitle={
          recommended.kind === "fallback"
            ? t("recommended.fallbackSubtitle")
            : t("recommended.subtitle")
        }
        emptyText={t("recommended.empty")}
      />

      {/* `key` is what makes the skeleton appear on every filter/page change:
          a changed key remounts the boundary, so React shows the fallback again
          instead of holding the previous results on screen. */}
      <Suspense
        key={JSON.stringify(sp)}
        fallback={<ProfileGridSkeleton count={BROWSE_PAGE_SIZE} />}
      >
        <BrowseFeed
          viewerId={effectiveViewerId}
          filters={filters}
          viewerRole={viewerRole}
          viewerCategory={viewerCategory}
          page={page}
          quota={quota}
          hasFilters={hasFilters}
          searchParams={sp}
        />
      </Suspense>
    </Container>
  );
}

/**
 * The paginated result set. Split into its own async component purely so it can
 * sit under a Suspense boundary — everything above it stays interactive while a
 * page is fetched.
 */
async function BrowseFeed({
  viewerId,
  filters,
  viewerRole,
  viewerCategory,
  page,
  quota,
  hasFilters,
  searchParams,
}: {
  viewerId: string;
  filters: SearchFilters;
  viewerRole: string | null;
  viewerCategory: string | null;
  page: number;
  quota: { unlimited: boolean; remaining: number; limit: number };
  hasFilters: boolean;
  searchParams: SP;
}) {
  const t = await getTranslations("Browse");
  const { profiles, total, page: current, pageCount } = await getBrowseProfiles(
    viewerId,
    filters,
    viewerRole,
    viewerCategory,
    { page, limit: BROWSE_PAGE_SIZE },
  );

  if (profiles.length === 0) {
    return hasFilters ? (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline bg-white py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink/40">
          <SearchIcon width={22} height={22} />
        </span>
        <p className="text-base font-semibold text-ink">{t("noMatch.title")}</p>
        <p className="max-w-xs text-sm text-ink/60">{t("noMatch.hint")}</p>
        <Link href="/browse" className="mt-1">
          <Button variant="outline" size="sm">
            {t("noMatch.clear")}
          </Button>
        </Link>
      </div>
    ) : (
      <p className="text-sm text-ink/60">{t("empty")}</p>
    );
  }

  return (
    <>
      {/* The count is the TOTAL across all pages, not this page's length —
          "12 profiles" on page 3 of 40 would be actively misleading. */}
      <p className="mb-4 font-body text-sm text-ink/50">
        {t("resultCount", { count: total, n: String(total) })}
      </p>

      <ProfileGrid profiles={profiles} quota={quota} />

      <BrowsePagination
        page={current}
        pageCount={pageCount}
        total={total}
        searchParams={searchParams}
      />
    </>
  );
}
