"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { removeObjects } from "@/lib/storage/supabase";
import {
  MAX_PHOTOS,
  storeProfileImage,
  validateUpload,
} from "@/lib/storage/images";

const PROFILE_EDIT = "/[locale]/profile/edit";
const BROWSE = "/[locale]/browse";
const PROFILE = "/[locale]/profiles/[id]";

/** Status codes the PhotoManager localizes under `ProfileEdit.photos.errors`. */
export type PhotoActionResult = { ok: true } | { ok: false; error: string };

const ok: PhotoActionResult = { ok: true };
const err = (error: string): PhotoActionResult => ({ ok: false, error });

function revalidateAll() {
  revalidatePath(PROFILE_EDIT, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
}

/** Resolve the caller's own profile id, or null when signed out / no profile. */
async function ownProfileId(): Promise<string | null> {
  const viewerId = await getViewerId();
  if (!viewerId) return null;
  const profile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/**
 * Confirm `imageId` belongs to the caller's own profile before mutating it —
 * the security boundary for delete / primary / privacy actions.
 */
async function ownImage(imageId: string) {
  const profileId = await ownProfileId();
  if (!profileId) return null;
  const image = await prisma.profileImage.findUnique({ where: { id: imageId } });
  if (!image || image.profileId !== profileId) return null;
  return image;
}

/** Upload one photo to the caller's gallery. New photos default to BLURRED. */
export async function uploadProfilePhoto(
  formData: FormData,
): Promise<PhotoActionResult> {
  const profileId = await ownProfileId();
  if (!profileId) return err("NO_PROFILE");

  const file = formData.get("photo");
  if (!(file instanceof File)) return err("EMPTY");
  const invalid = validateUpload(file);
  if (invalid) return err(invalid);

  const count = await prisma.profileImage.count({ where: { profileId } });
  if (count >= MAX_PHOTOS) return err("LIMIT");

  let keys;
  try {
    keys = await storeProfileImage(profileId, file);
  } catch (e) {
    return err(e instanceof Error && e.message === "DECODE" ? "DECODE" : "UPLOAD");
  }

  await prisma.profileImage.create({
    data: {
      profileId,
      originalKey: keys.originalKey,
      blurredKey: keys.blurredKey,
      privacy: "BLURRED",
      isPrimary: count === 0, // first photo becomes the primary automatically
      sortOrder: count,
    },
  });

  revalidateAll();
  return ok;
}

/** Delete a photo (row + both storage objects); re-promote a primary if needed. */
export async function deleteProfilePhoto(
  imageId: string,
): Promise<PhotoActionResult> {
  const image = await ownImage(imageId);
  if (!image) return err("FORBIDDEN");

  await prisma.profileImage.delete({ where: { id: image.id } });
  await removeObjects([image.originalKey, image.blurredKey]);

  // If the deleted photo was primary, promote the next one so a gallery always
  // has a primary (drives the browse/detail thumbnail).
  if (image.isPrimary) {
    const next = await prisma.profileImage.findFirst({
      where: { profileId: image.profileId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (next) {
      await prisma.profileImage.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidateAll();
  return ok;
}

/** Make `imageId` the single primary photo for the caller's profile. */
export async function setPrimaryPhoto(
  imageId: string,
): Promise<PhotoActionResult> {
  const image = await ownImage(imageId);
  if (!image) return err("FORBIDDEN");

  await prisma.$transaction([
    prisma.profileImage.updateMany({
      where: { profileId: image.profileId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.profileImage.update({
      where: { id: image.id },
      data: { isPrimary: true },
    }),
  ]);

  revalidateAll();
  return ok;
}

/** Toggle a photo between PUBLIC (visible to all) and BLURRED (gated). */
export async function setPhotoPrivacy(
  imageId: string,
  privacy: "PUBLIC" | "BLURRED",
): Promise<PhotoActionResult> {
  const image = await ownImage(imageId);
  if (!image) return err("FORBIDDEN");

  await prisma.profileImage.update({
    where: { id: image.id },
    data: { privacy },
  });

  revalidateAll();
  return ok;
}
