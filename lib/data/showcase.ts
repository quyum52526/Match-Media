import "server-only";
import { unstable_cache } from "next/cache";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_URL_TTL, signUrl } from "@/lib/storage/supabase";

export interface ShowcaseProfile {
  id: string;
  displayName: string;
  location: string;
  isVerified: boolean;
  isPro: boolean;
  /**
   * Signed URL for the card photo: the ORIGINAL for a PUBLIC photo, the blurred
   * derivative for a BLURRED one. Undefined when the profile has no approved
   * photo or the URL could not be signed — the card then renders an initials
   * avatar (see ShowcaseAvatar).
   */
  imageUrl?: string;
}

// Fetch one APPROVED photo per profile for the homepage cards.
//
// Moderation is a hard requirement (a PENDING/REJECTED photo must never leave the
// server), but privacy is NOT a filter here: a BLURRED photo still earns a
// showcase spot, it just contributes its blurred derivative instead of the
// original (see pickShowcaseKey). Requiring PUBLIC used to exclude every profile
// that kept its photos gated — which is most of them — leaving whole sections
// empty and falling back to the decorative placeholder card.
//
// Ordering prefers a PUBLIC photo over a BLURRED one (a clear card looks better),
// then the primary, so the best available image wins. isPrimary is not required.
const showcaseInclude = {
  user: { select: { isPro: true } },
  images: {
    where: { moderationStatus: "APPROVED" as const },
    orderBy: [
      { privacy: "desc" as const }, // "PUBLIC" > "BLURRED" alphabetically
      { isPrimary: "desc" as const },
      { sortOrder: "asc" as const },
    ],
    take: 1,
  },
} satisfies Prisma.ProfileInclude;

type ShowcaseRow = Prisma.ProfileGetPayload<{ include: typeof showcaseInclude }>;

// Base filter shared by every homepage query:
//   • Must be a managed profile (userId=null) OR a self-registered candidate (SELF).
//     PARENTS/MEDIA/AGENT/ADMIN personal profiles are excluded.
//   • Must have at least one APPROVED photo. Privacy is deliberately not part of
//     the gate (a BLURRED photo shows its blurred derivative), and isPrimary is
//     not required — a profile with photos but no primary flag still qualifies.
const showcaseWhere = {
  OR: [
    { userId: null },
    { user: { accountCategory: "SELF" as const } },
  ],
  images: {
    some: { moderationStatus: "APPROVED" as const },
  },
} satisfies Prisma.ProfileWhereInput;

/**
 * THE PRIVACY BOUNDARY for the public homepage.
 *
 * The homepage is served to anonymous visitors, so the original (unblurred) key
 * may only ever be signed for a photo its owner explicitly made PUBLIC. A
 * BLURRED photo contributes its pre-blurred derivative instead — the identical
 * rule `hydrateProfileCards` applies to a gated viewer in lib/data/profiles.ts.
 *
 * Never "simplify" this to `originalKey`: the showcase query intentionally admits
 * BLURRED photos, so that would publish gated photos to the open internet.
 */
function pickShowcaseKey(
  image: ShowcaseRow["images"][number] | undefined,
): string | null {
  if (!image) return null;
  return image.privacy === "PUBLIC" ? image.originalKey : image.blurredKey;
}

async function toShowcaseProfiles(rows: ShowcaseRow[]): Promise<ShowcaseProfile[]> {
  // Sign each profile's photo individually so the storage key is used as-is,
  // with no path transformation that could break Map lookups. The admin client
  // (service-role key) bypasses RLS entirely — no viewerId check is needed here,
  // because pickShowcaseKey has already reduced the key to one that is safe to
  // publish.
  return Promise.all(
    rows.map(async (r) => {
      const imgKey = pickShowcaseKey(r.images[0]);
      // A failed signature (storage unconfigured) leaves imageUrl undefined and
      // the card renders its initials avatar. We deliberately do NOT fall back
      // to an unsigned public-object URL: it only resolves on a public-read
      // bucket, otherwise it renders as a broken image instead of the styled
      // fallback.
      //
      // NOTE: signing does NOT prove the object exists. createSignedUrl() signs
      // a PATH, so a row pointing at a missing object (seeded placeholder keys,
      // a file deleted from the bucket) returns a valid URL that then 400s on
      // fetch. Verifying here would cost a HEAD request per card, so the guard
      // lives at the leaf instead: ShowcaseImage swaps to the initials avatar
      // on the image's own error event.
      // PUBLIC_URL_TTL, not the gated default: pickShowcaseKey has already
      // reduced this to a publishable key (original only when the owner marked
      // the photo PUBLIC, otherwise the blurred derivative), so there is no
      // access grant here that could later need revoking.
      const imageUrl = imgKey
        ? ((await signUrl(imgKey, PUBLIC_URL_TTL)) ?? undefined)
        : undefined;

      return {
        // Managed profiles have userId=null; fall back to profile.id for a stable key.
        id: r.userId ?? r.id,
        displayName: r.nameHidden || !r.fullName ? "Member" : r.fullName,
        location: [r.upazila, r.district].filter(Boolean).join(", "),
        isVerified: r.isVerified,
        isPro: r.user?.isPro ?? false,
        imageUrl,
      };
    }),
  );
}

/**
 * Recently-active profiles for the hero marquee. Ordered by updatedAt so the
 * strip feels live. No exclusion needed — the marquee is visually distinct from
 * the stacked sections and scrolls past too quickly to cause confusion.
 */
export async function getMarqueeProfiles(limit = 10): Promise<ShowcaseProfile[]> {
  const rows = await prisma.profile.findMany({
    where: showcaseWhere,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  return toShowcaseProfiles(rows);
}

export interface HomepageShowcase {
  recommendedProfiles: ShowcaseProfile[];
  premiumProfiles: ShowcaseProfile[];
  newProfiles: ShowcaseProfile[];
  verifiedProfiles: ShowcaseProfile[];
}

/**
 * Waterfall query: each section excludes IDs already claimed by higher-priority
 * sections, so no profile appears twice on the homepage.
 * Priority: Recommended → Premium → New → Verified. Recommendations prefer
 * admin-featured profiles, then fill remaining slots with recent verified ones.
 */
export async function getHomepageShowcase(): Promise<HomepageShowcase> {
  const featuredRows = await prisma.profile.findMany({
    where: { ...showcaseWhere, isFeatured: true },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const fallbackRows = featuredRows.length < 3
    ? await prisma.profile.findMany({
        where: {
          ...showcaseWhere,
          isVerified: true,
          id: { notIn: featuredRows.map((r) => r.id) },
        },
        take: 3 - featuredRows.length,
        orderBy: { createdAt: "desc" },
        include: showcaseInclude,
      })
    : [];
  const recommendedRows = [...featuredRows, ...fallbackRows];
  const recommendedIds = recommendedRows.map((r) => r.id);
  const recommendedOwnerIds = recommendedRows
    .map((r) => r.userId)
    .filter((id): id is string => id !== null);

  const premiumRows = await prisma.profile.findMany({
    where: {
      ...showcaseWhere,
      user: { accountCategory: "SELF", isPro: true },
      NOT: [
        { id: { in: recommendedIds } },
        { userId: { in: recommendedOwnerIds } },
      ],
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const premiumIds = premiumRows.map((r) => r.userId).filter((id): id is string => id !== null);

  const newRows = await prisma.profile.findMany({
    where: {
      ...showcaseWhere,
      userId: { not: null, notIn: [...recommendedOwnerIds, ...premiumIds] },
      id: { notIn: recommendedIds },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const excludeIds = [
    ...recommendedOwnerIds,
    ...premiumIds,
    ...newRows.map((r) => r.userId).filter((id): id is string => id !== null),
  ];
  const excludeProfileIds = [
    ...recommendedIds,
    ...premiumRows.map((r) => r.id),
    ...newRows.map((r) => r.id),
  ];

  const verifiedRows = await prisma.profile.findMany({
    where: {
      ...showcaseWhere,
      isVerified: true,
      userId: { not: null, notIn: excludeIds },
      id: { notIn: excludeProfileIds },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });

  const [recommendedProfiles, premiumProfiles, newProfiles, verifiedProfiles] = await Promise.all([
    toShowcaseProfiles(recommendedRows),
    toShowcaseProfiles(premiumRows),
    toShowcaseProfiles(newRows),
    toShowcaseProfiles(verifiedRows),
  ]);

  return { recommendedProfiles, premiumProfiles, newProfiles, verifiedProfiles };
}

// ---------------------------------------------------------------------------
// Cached entry points for the public homepage
// ---------------------------------------------------------------------------

/**
 * How long the homepage showcase is reused before a background refresh.
 *
 * HARD CONSTRAINT: this must stay well under PUBLIC_URL_TTL, the lifetime these
 * cards' URLs are signed with. The cached value contains Supabase signed URLs,
 * so caching it for longer than those signatures live would serve expired links
 * and every card would 403. A build-time assert guards the pair, since the
 * failure is invisible until the images break in production.
 */
export const SHOWCASE_REVALIDATE_SECONDS = 600;

if (SHOWCASE_REVALIDATE_SECONDS >= PUBLIC_URL_TTL) {
  throw new Error(
    `SHOWCASE_REVALIDATE_SECONDS (${SHOWCASE_REVALIDATE_SECONDS}) must be well below ` +
      `PUBLIC_URL_TTL (${PUBLIC_URL_TTL}), or cached showcase photos will 403.`,
  );
}

/**
 * Why cache the DATA and not the page:
 *
 * The [locale] layout awaits getViewerId() for the session-aware header, which
 * reads cookies and therefore opts every route — homepage included — into
 * dynamic rendering. A page-level `export const revalidate` cannot override
 * that, so the homepage is re-rendered per request no matter what.
 *
 * Caching here gets the actual win anyway: the render still runs per request,
 * but the Prisma queries and the Supabase URL signing (4 queries + up to 13
 * signatures) collapse to one shared, periodically-refreshed result instead of
 * running for every anonymous visitor.
 *
 * Both are tagged "showcase", so a future admin action can call
 * revalidateTag("showcase") to push a change out immediately.
 */
export const getCachedHomepageShowcase = unstable_cache(
  getHomepageShowcase,
  ["homepage-showcase"],
  { revalidate: SHOWCASE_REVALIDATE_SECONDS, tags: ["showcase"] },
);

export const getCachedMarqueeProfiles = unstable_cache(
  () => getMarqueeProfiles(),
  ["homepage-marquee"],
  { revalidate: SHOWCASE_REVALIDATE_SECONDS, tags: ["showcase"] },
);
