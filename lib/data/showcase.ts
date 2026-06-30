import "server-only";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signUrl, STORAGE_BUCKET } from "@/lib/storage/supabase";

export interface ShowcaseProfile {
  id: string;
  displayName: string;
  location: string;
  isVerified: boolean;
  isPro: boolean;
  imageUrl?: string; // defined only when a PUBLIC+APPROVED primary photo exists
}

// Fetch one PUBLIC + APPROVED photo per profile for the homepage cards.
// isPrimary is not required: any qualifying photo is fine for the showcase.
const showcaseInclude = {
  user: { select: { isPro: true } },
  images: {
    where: {
      moderationStatus: "APPROVED" as const,
      privacy: "PUBLIC" as const,
    },
    orderBy: { isPrimary: "desc" as const }, // prefer the primary when it exists
    take: 1,
  },
} satisfies Prisma.ProfileInclude;

type ShowcaseRow = Prisma.ProfileGetPayload<{ include: typeof showcaseInclude }>;

// Base filter shared by every homepage query:
//   • Must be a managed profile (userId=null) OR a self-registered candidate (SELF).
//     PARENTS/MEDIA/AGENT/ADMIN personal profiles are excluded.
//   • Must have at least one PUBLIC + APPROVED photo (isPrimary not required —
//     profiles with photos but no primary flag still deserve a showcase spot).
const showcaseWhere = {
  OR: [
    { userId: null },
    { user: { accountCategory: "SELF" as const } },
  ],
  images: {
    some: {
      moderationStatus: "APPROVED" as const,
      privacy: "PUBLIC" as const,
    },
  },
} satisfies Prisma.ProfileWhereInput;

async function toShowcaseProfiles(rows: ShowcaseRow[]): Promise<ShowcaseProfile[]> {
  // Sign each profile's photo individually so the storage key is used as-is,
  // with no path transformation that could break Map lookups. The admin client
  // (service-role key) bypasses RLS entirely — no viewerId check is needed here.
  // showcaseWhere already guarantees every row has a PUBLIC+APPROVED photo, so
  // the original (unblurred) key is always safe to expose to anonymous visitors.
  return Promise.all(
    rows.map(async (r) => {
      const imgKey = r.images[0]?.originalKey ?? null;
      let imageUrl: string | undefined;
      if (imgKey) {
        const signed = await signUrl(imgKey);
        if (signed) {
          imageUrl = signed;
        } else {
          // signUrl failed (Supabase not configured or unreachable). Fall back to
          // the direct public storage URL — works when the bucket has public reads
          // enabled, which is the expected setup for PUBLIC showcase photos.
          const supabaseUrl = process.env.SUPABASE_URL;
          if (supabaseUrl) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${imgKey}`;
          }
        }
      }

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
  premiumProfiles: ShowcaseProfile[];
  newProfiles: ShowcaseProfile[];
  verifiedProfiles: ShowcaseProfile[];
}

/**
 * Waterfall query: each section excludes IDs already claimed by higher-priority
 * sections, so no profile appears twice on the homepage.
 * Priority: Premium → New → Verified
 */
export async function getHomepageShowcase(): Promise<HomepageShowcase> {
  const premiumRows = await prisma.profile.findMany({
    where: { ...showcaseWhere, user: { accountCategory: "SELF", isPro: true } },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const premiumIds = premiumRows.map((r) => r.userId).filter((id): id is string => id !== null);

  const newRows = await prisma.profile.findMany({
    where: { ...showcaseWhere, userId: { not: null, notIn: premiumIds } },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const excludeIds = [...premiumIds, ...newRows.map((r) => r.userId).filter((id): id is string => id !== null)];

  const verifiedRows = await prisma.profile.findMany({
    where: { ...showcaseWhere, isVerified: true, userId: { not: null, notIn: excludeIds } },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });

  const [premiumProfiles, newProfiles, verifiedProfiles] = await Promise.all([
    toShowcaseProfiles(premiumRows),
    toShowcaseProfiles(newRows),
    toShowcaseProfiles(verifiedRows),
  ]);

  return { premiumProfiles, newProfiles, verifiedProfiles };
}
