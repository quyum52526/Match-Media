"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { calcAge, computeCompletion } from "@/lib/utils";

type AccountCategory = "SELF" | "PARENTS" | "MEDIA" | "AGENT";

// Map accountCategory → role stored on User.
const CATEGORY_TO_ROLE: Record<AccountCategory, string> = {
  SELF: "GENERAL",
  PARENTS: "GUARDIAN",
  MEDIA: "MEDIA",
  AGENT: "AGENT",
};

/**
 * Step 1 — save the chosen account category to the User row.
 * Also syncs the role field (MEDIA/AGENT get matching roles; SELF/PARENTS get GENERAL/GUARDIAN).
 * Revalidates the root layout so the dashboard redirect guard sees the updated category.
 */
export async function saveCategoryAction(
  category: AccountCategory,
): Promise<{ ok: true } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountCategory: category,
      role: CATEGORY_TO_ROLE[category] as never,
    },
  });

  // Bust the entire layout cache so the dashboard redirect guard in
  // app/[locale]/page.tsx re-reads the now-set accountCategory.
  revalidatePath("/", "layout");

  return { ok: true };
}

/**
 * Step 2 (SELF / PARENTS) — create or update the user's matrimonial Profile
 * with the basic details collected in StepBasicDetails.
 */
export async function saveBasicDetailsAction(data: {
  gender: string;
  dateOfBirth: string; // "yyyy-mm-dd"
  maritalStatus: string;
  profession?: string;
  district?: string;
}): Promise<{ ok: true } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };

  if (!data.gender) return { error: "Gender is required." };
  if (!data.dateOfBirth) return { error: "Date of birth is required." };
  if (!data.maritalStatus) return { error: "Marital status is required." };

  const dob = new Date(data.dateOfBirth);
  if (isNaN(dob.getTime())) return { error: "Invalid date of birth." };
  if (calcAge(dob) < 18) return { error: "You must be at least 18 years old." };

  const profession = data.profession?.trim() || null;
  const district = data.district?.trim() || null;

  const completionScore = computeCompletion([
    data.gender,
    dob,
    district,
    null, // upazila (not collected here)
    profession,
    null, // education
    data.maritalStatus,
    null, null, null, null, null, // bio, height, weight, childrenStatus, familyDetails
  ]);

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      gender: data.gender,
      dateOfBirth: dob,
      maritalStatus: data.maritalStatus,
      profession,
      district,
      completionScore,
    },
    update: {
      // gender is immutable once set — skip if profile already exists
      dateOfBirth: dob,
      maritalStatus: data.maritalStatus,
      profession,
      district,
      completionScore,
    },
  });

  revalidatePath("/profile/edit", "page");
  return { ok: true };
}

/**
 * Step 2 (MEDIA) — save agency details to the User row.
 */
export async function saveMediaDetailsAction(data: {
  agencyName: string;
  contactPerson: string;
  agencyDistrict?: string;
}): Promise<{ ok: true } | { error: string }> {
  const userId = await getViewerId();
  if (!userId) return { error: "Not authenticated." };

  if (!data.agencyName.trim()) return { error: "Agency name is required." };
  if (!data.contactPerson.trim()) return { error: "Contact person is required." };

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
}
