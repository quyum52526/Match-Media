"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { uploadObject } from "@/lib/storage/supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    // Surface a clear hint when the DB migration hasn't been applied yet.
    if (e.message.includes("agencyLogo") || e.message.includes("tradeLicenseUrl") || e.message.includes("agencyVerificationStatus")) {
      return "Database migration not yet applied. Run the migration SQL in the Supabase Dashboard, then retry.";
    }
    return e.message;
  }
  return "An unexpected error occurred. Please try again.";
}

// ---------------------------------------------------------------------------
// Agency profile details
// ---------------------------------------------------------------------------

export async function updateAgencyDetails(data: {
  agencyName: string;
  contactPerson: string;
  agencyDistrict?: string;
}): Promise<{ ok: true } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };
  if (!data.agencyName.trim()) return { error: "Agency name is required." };
  if (!data.contactPerson.trim()) return { error: "Contact person name is required." };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        agencyName: data.agencyName.trim(),
        contactPerson: data.contactPerson.trim(),
        agencyDistrict: data.agencyDistrict?.trim() || null,
      },
    });
    revalidatePath("/profile/edit", "page");
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

// ---------------------------------------------------------------------------
// Logo upload — resized to 256×256 WebP, stored as agency/{userId}/logo.webp
// ---------------------------------------------------------------------------

export async function uploadAgencyLogo(
  formData: FormData,
): Promise<{ ok: true; key: string } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };

  try {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "No file provided." };
    if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2 MB." };
    if (!file.type.startsWith("image/")) return { error: "Only image files are accepted for the logo." };

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
    const key = `agency/${userId}/logo.webp`;
    await uploadObject(key, processed, "image/webp");

    // Persist the storage key on the User row.
    await prisma.user.update({
      where: { id: userId },
      data: { agencyLogo: key },
    });

    revalidatePath("/profile/edit", "page");
    return { ok: true, key };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

// ---------------------------------------------------------------------------
// Trade license upload → sets verificationStatus to PENDING_APPROVAL
// ---------------------------------------------------------------------------

const ALLOWED_LICENSE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export async function submitTradeLicense(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };

  try {
    // Verify account category. Intentionally avoid selecting agencyVerificationStatus
    // here — that column may not exist yet if the migration is pending. We guard
    // against double-submission via the status check below which is also in a try/catch.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountCategory: true },
    });
    if (user?.accountCategory !== "MEDIA") {
      return { error: "Only Media Agency accounts can submit for verification." };
    }

    // Check current verification status (column added by migration).
    // Gracefully degrade if the column doesn't exist yet.
    try {
      const statusRow = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyVerificationStatus: true },
      });
      if (statusRow?.agencyVerificationStatus === "VERIFIED") {
        return { error: "Your agency is already verified." };
      }
    } catch {
      // Migration not applied yet — column missing. Continue to let the upload
      // proceed; the DB update below will surface a clear error if needed.
    }

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "No file provided." };
    if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB." };
    if (!ALLOWED_LICENSE_TYPES.includes(file.type as (typeof ALLOWED_LICENSE_TYPES)[number])) {
      return { error: "Accepted formats: PDF, JPG, PNG, WebP." };
    }

    const extMap: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    // Upload the document to Supabase Storage.
    const key = `agency/${userId}/trade_license.${extMap[file.type]}`;
    const body = Buffer.from(await file.arrayBuffer());
    await uploadObject(key, body, file.type);

    // Save the storage key and advance the verification status.
    await prisma.user.update({
      where: { id: userId },
      data: {
        tradeLicenseUrl: key,
        agencyVerificationStatus: "PENDING_APPROVAL",
      },
    });

    revalidatePath("/profile/edit", "page");
    return { ok: true };
  } catch (e) {
    return { error: errMsg(e) };
  }
}
