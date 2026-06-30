import "server-only";
import { prisma } from "@/lib/prisma";
import { signUrls } from "@/lib/storage/supabase";
import type { ImagePrivacy, ModerationStatus } from "@/components/profile/types";

/** A profile owner's own photo, shaped for the management UI. */
export interface OwnPhoto {
  id: string;
  /** Signed URL to the ORIGINAL — the owner always sees their own clear photo. */
  url: string;
  privacy: ImagePrivacy;
  isPrimary: boolean;
  /** Pre-moderation state; the owner sees pending/rejected even pre-approval. */
  moderationStatus: ModerationStatus;
  rejectionReason: string | null;
}

/**
 * Fetch photos for a client profile managed by a MEDIA agency, for the edit
 * page. Returns [] if the profile isn't owned by this agency.
 */
export async function getClientPhotos(
  agencyUserId: string,
  clientProfileId: string,
): Promise<OwnPhoto[]> {
  const profile = await prisma.profile.findUnique({
    where: { id: clientProfileId },
    select: { id: true, managedByAgency: true, referredById: true },
  });
  if (
    !profile ||
    !profile.managedByAgency ||
    profile.referredById !== agencyUserId
  ) {
    return [];
  }
  return fetchPhotosForProfile(profile.id);
}

/**
 * The current user's own gallery (clear originals), ordered primary-first then
 * by sortOrder. Returns [] when the user has no profile yet. Used by the
 * PhotoManager on /profile/edit — never exposed to other viewers.
 */
async function fetchPhotosForProfile(profileId: string): Promise<OwnPhoto[]> {
  const images = await prisma.profileImage.findMany({
    where: { profileId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      originalKey: true,
      privacy: true,
      isPrimary: true,
      moderationStatus: true,
      rejectionReason: true,
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
        moderationStatus: i.moderationStatus as ModerationStatus,
        rejectionReason: i.rejectionReason,
      } satisfies OwnPhoto;
    })
    .filter((p): p is OwnPhoto => p !== null);
}

export async function getOwnPhotos(viewerId: string): Promise<OwnPhoto[]> {
  const profile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { id: true },
  });
  if (!profile) return [];
  return fetchPhotosForProfile(profile.id);
}
