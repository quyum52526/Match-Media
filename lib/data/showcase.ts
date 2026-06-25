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

export async function getPremiumShowcaseProfiles(): Promise<ShowcaseProfile[]> {
  const rows = await prisma.profile.findMany({
    where: { user: { isPro: true } },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  return toShowcaseProfiles(rows);
}

export async function getNewShowcaseProfiles(): Promise<ShowcaseProfile[]> {
  const rows = await prisma.profile.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  return toShowcaseProfiles(rows);
}

export async function getVerifiedShowcaseProfiles(): Promise<ShowcaseProfile[]> {
  const rows = await prisma.profile.findMany({
    where: { isVerified: true },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: showcaseInclude,
  });
  return toShowcaseProfiles(rows);
}
