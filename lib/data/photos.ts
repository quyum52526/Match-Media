import "server-only";
import { prisma } from "@/lib/prisma";
import { signUrls } from "@/lib/storage/supabase";
import type { ImagePrivacy } from "@/components/profile/types";

/** A profile owner's own photo, shaped for the management UI. */
export interface OwnPhoto {
  id: string;
  /** Signed URL to the ORIGINAL — the owner always sees their own clear photo. */
  url: string;
  privacy: ImagePrivacy;
  isPrimary: boolean;
}

/**
 * The current user's own gallery (clear originals), ordered primary-first then
 * by sortOrder. Returns [] when the user has no profile yet. Used by the
 * PhotoManager on /profile/edit — never exposed to other viewers.
 */
export async function getOwnPhotos(viewerId: string): Promise<OwnPhoto[]> {
  const profile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { id: true },
  });
  if (!profile) return [];

  const images = await prisma.profileImage.findMany({
    where: { profileId: profile.id },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      originalKey: true,
      privacy: true,
      isPrimary: true,
    },
  });
  if (images.length === 0) return [];

  const urls = await signUrls(images.map((i) => i.originalKey));

  return images
    .map((i) => {
      const url = urls.get(i.originalKey);
      if (!url) return null;
      return {
        id: i.id,
        url,
        privacy: i.privacy as ImagePrivacy,
        isPrimary: i.isPrimary,
      } satisfies OwnPhoto;
    })
    .filter((p): p is OwnPhoto => p !== null);
}
