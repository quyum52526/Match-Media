import "server-only";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signUrls } from "@/lib/storage/supabase";

export interface ShowcaseProfile {
  id: string;
  displayName: string;
  location: string;
  isVerified: boolean;
  isPro: boolean;
  imageUrl?: string; // defined only when a PUBLIC+APPROVED primary photo exists
}

// Only surface PUBLIC, APPROVED primary photos to anonymous visitors.
const showcaseInclude = {
  user: { select: { isPro: true } },
  images: {
    where: {
      isPrimary: true,
      moderationStatus: "APPROVED" as const,
      privacy: "PUBLIC" as const,
    },
    take: 1,
  },
} satisfies Prisma.ProfileInclude;

type ShowcaseRow = Prisma.ProfileGetPayload<{ include: typeof showcaseInclude }>;

async function toShowcaseProfiles(rows: ShowcaseRow[]): Promise<ShowcaseProfile[]> {
  const keys = rows.flatMap((r) => r.images.map((img) => img.originalKey));
  const signed = await signUrls(keys);

  return rows.map((r) => ({
    id: r.userId,
    displayName: r.nameHidden || !r.fullName ? "Member" : r.fullName,
    location: [r.upazila, r.district].filter(Boolean).join(", "),
    isVerified: r.isVerified,
    isPro: r.user.isPro,
    imageUrl: r.images[0] ? signed.get(r.images[0].originalKey) : undefined,
  }));
}

/**
 * Recently-active profiles for the hero marquee. Ordered by updatedAt so the
 * strip feels live. No exclusion needed — the marquee is visually distinct from
 * the stacked sections and scrolls past too quickly to cause confusion.
 */
export async function getMarqueeProfiles(limit = 10): Promise<ShowcaseProfile[]> {
  const rows = await prisma.profile.findMany({
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
    where: { user: { isPro: true } },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const premiumIds = premiumRows.map((r) => r.userId);

  const newRows = await prisma.profile.findMany({
    where: { userId: { notIn: premiumIds } },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  const excludeIds = [...premiumIds, ...newRows.map((r) => r.userId)];

  const verifiedRows = await prisma.profile.findMany({
    where: { isVerified: true, userId: { notIn: excludeIds } },
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
