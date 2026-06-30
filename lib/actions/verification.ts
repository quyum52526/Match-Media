"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/storage/supabase";

export type VerificationResult = { ok: true } | { error: string };

const VERIFY_BUCKET = "verification-docs";
const VERIFY_PAGE = "/[locale]/profile/verify";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

async function uploadVerificationFile(
  userId: string,
  slot: string, // e.g. "nid-front", "nid-back", "selfie"
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `${userId}/${slot}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabaseAdmin()
    .storage.from(VERIFY_BUCKET)
    .upload(key, buffer, { contentType: file.type || "image/jpeg", upsert: true });

  if (error) throw new Error(`Upload failed (${slot}): ${error.message}`);
  return key;
}

/**
 * User submits NID front + back images via FormData.
 * Files are uploaded to the private "verification-docs" Supabase bucket;
 * only the storage keys are persisted in the DB.
 */
export async function submitNid(
  formData: FormData,
): Promise<VerificationResult> {
  const userId = await requireViewerId("/login");

  const frontFile = formData.get("nidFront") as File | null;
  const backFile = formData.get("nidBack") as File | null;

  if (!frontFile || frontFile.size === 0) return { error: "NID front image is required." };
  if (!backFile || backFile.size === 0) return { error: "NID back image is required." };
  if (frontFile.size > MAX_FILE_BYTES) return { error: "NID front image must be under 5 MB." };
  if (backFile.size > MAX_FILE_BYTES) return { error: "NID back image must be under 5 MB." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nidVerificationStatus: true },
  });
  if (user?.nidVerificationStatus === "APPROVED") {
    return { error: "Your NID is already verified." };
  }
  if (user?.nidVerificationStatus === "PENDING") {
    return { error: "Your NID submission is already under review." };
  }

  let frontKey: string, backKey: string;
  try {
    [frontKey, backKey] = await Promise.all([
      uploadVerificationFile(userId, "nid-front", frontFile),
      uploadVerificationFile(userId, "nid-back", backFile),
    ]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      nidFrontKey: frontKey,
      nidBackKey: backKey,
      nidVerificationStatus: "PENDING",
      nidReviewNote: null,
    },
  });

  revalidatePath(VERIFY_PAGE, "page");
  return { ok: true };
}

/**
 * User submits a live selfie photo.
 */
export async function submitSelfie(
  formData: FormData,
): Promise<VerificationResult> {
  const userId = await requireViewerId("/login");

  const selfieFile = formData.get("selfie") as File | null;
  if (!selfieFile || selfieFile.size === 0) return { error: "Selfie image is required." };
  if (selfieFile.size > MAX_FILE_BYTES) return { error: "Selfie must be under 5 MB." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { selfieVerificationStatus: true },
  });
  if (user?.selfieVerificationStatus === "APPROVED") {
    return { error: "Your selfie is already verified." };
  }
  if (user?.selfieVerificationStatus === "PENDING") {
    return { error: "Your selfie submission is already under review." };
  }

  let selfieKey: string;
  try {
    selfieKey = await uploadVerificationFile(userId, "selfie", selfieFile);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      selfieKey: selfieKey,
      selfieVerificationStatus: "PENDING",
      selfieReviewNote: null,
    },
  });

  revalidatePath(VERIFY_PAGE, "page");
  return { ok: true };
}
