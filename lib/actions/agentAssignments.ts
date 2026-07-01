"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getViewerId, requireViewerId } from "@/lib/session";
import { uploadObject } from "@/lib/storage/supabase";

/** Agent acknowledges a PENDING assignment → IN_PROGRESS. */
export async function startAssignment(assignmentId: string) {
  const agentId = await requireViewerId("/login");

  await prisma.verificationAssignment.updateMany({
    where: { id: assignmentId, agentId, status: "PENDING" },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  revalidatePath("/profile/edit");
}

/** Agent submits completion report → SUBMITTED (awaiting admin review). */
export async function submitAssignment(assignmentId: string, note: string) {
  const agentId = await requireViewerId("/login");

  if (!note.trim()) return { error: "Report note is required." };

  await prisma.verificationAssignment.updateMany({
    where: { id: assignmentId, agentId, status: "IN_PROGRESS" },
    data: { status: "SUBMITTED", agentNote: note.trim(), submittedAt: new Date() },
  });

  revalidatePath("/profile/edit");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Avatar upload — resized to 256×256 WebP, stored as agent/{userId}/avatar.webp
// ---------------------------------------------------------------------------

export async function uploadAgentAvatar(
  formData: FormData,
): Promise<{ ok: true; key: string } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };

  try {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "No file provided." };
    if (file.size > 2 * 1024 * 1024) return { error: "Image must be under 2 MB." };
    if (!file.type.startsWith("image/")) return { error: "Only image files are accepted." };

    // Process the image with sharp — resize to a square avatar.
    const input = Buffer.from(await file.arrayBuffer());
    let processed: Buffer;
    try {
      processed = await sharp(input)
        .rotate()
        .resize({ width: 256, height: 256, fit: "cover", position: "center" })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      return { error: "Could not process the image. Please try a different file." };
    }

    // Upload to Supabase Storage.
    const key = `agent/${userId}/avatar.webp`;
    await uploadObject(key, processed, "image/webp");

    // Persist the storage key on the User row.
    await prisma.user.update({
      where: { id: userId },
      data: { agentAvatarKey: key },
    });

    revalidatePath("/profile/edit");
    return { ok: true, key };
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred. Please try again.";
    return { error: message };
  }
}
