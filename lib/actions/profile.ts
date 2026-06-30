"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calcAge, computeCompletion, resolveImmutableGender } from "@/lib/utils";
import { getViewerId } from "@/lib/session";
import { GENDERS } from "@/lib/constants/profileOptions";

const PROFILE_EDIT = "/[locale]/profile/edit";
const BROWSE = "/[locale]/browse";
const PROFILE = "/[locale]/profiles/[id]";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/**
 * Update (or create, for users without one yet) the current user's profile.
 * gender + dateOfBirth are required by the schema; completionScore is recomputed
 * from the provided data. Returns a status code the form can localize.
 */
export async function updateProfile(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const viewerId = await getViewerId();
  if (!viewerId) return "UNAUTH";

  // If a clientId is embedded in the form, the agency is editing a managed
  // client profile rather than their own. Verify ownership before proceeding.
  const clientId = field(formData, "clientId");
  const isClientEdit = Boolean(clientId);

  if (isClientEdit) {
    // Security: confirm caller is a MEDIA account that owns this profile.
    const user = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { accountCategory: true },
    });
    if (user?.accountCategory !== "MEDIA" && user?.accountCategory !== "PARENTS") return "UNAUTH";

    const clientProfile = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { referredById: true, managedByAgency: true, gender: true },
    });
    if (
      !clientProfile ||
      !clientProfile.managedByAgency ||
      clientProfile.referredById !== viewerId
    ) {
      return "UNAUTH";
    }

    return updateProfileById(clientId, clientProfile.gender, formData);
  }

  // Standard self-edit path.
  const existing = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { id: true, gender: true },
  });

  const dob = field(formData, "dateOfBirth");
  const lockedGender = existing?.gender?.trim();
  const gender = resolveImmutableGender(existing?.gender, field(formData, "gender"));
  if (!gender || !dob) return "MISSING";
  if (!lockedGender && !GENDERS.some((g) => g.value === gender)) return "MISSING";

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "MISSING";
  if (calcAge(birthDate) < 18) return "AGE";

  const fullName = field(formData, "fullName");
  const district = field(formData, "district");
  const upazila = field(formData, "upazila");
  const profession = field(formData, "profession");
  const education = field(formData, "education");
  const maritalStatus = field(formData, "maritalStatus");
  const height = field(formData, "height");
  const weight = field(formData, "weight");
  const childrenStatus = field(formData, "childrenStatus");
  const familyDetails = field(formData, "familyDetails");
  const bio = field(formData, "bio");
  const nameHidden = formData.get("nameHidden") === "on";

  const completionScore = computeCompletion([
    gender, birthDate, district, upazila, profession, education,
    maritalStatus, bio, height, weight, childrenStatus, familyDetails,
  ]);

  const data = {
    fullName: fullName || null,
    gender,
    dateOfBirth: birthDate,
    district: district || null,
    upazila: upazila || null,
    profession: profession || null,
    education: education || null,
    maritalStatus: maritalStatus || null,
    height: height || null,
    weight: weight || null,
    childrenStatus: childrenStatus || null,
    familyDetails: familyDetails || null,
    bio: bio || null,
    nameHidden,
    completionScore,
  };

  await prisma.profile.upsert({
    where: { userId: viewerId },
    update: data,
    create: { userId: viewerId, ...data },
  });

  revalidatePath(PROFILE_EDIT, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  return "OK";
}

/**
 * Shared update logic when editing a profile by its ID directly
 * (agency editing a client profile). Gender is immutable on this path too.
 */
async function updateProfileById(
  profileId: string,
  existingGender: string | null,
  formData: FormData,
): Promise<string | undefined> {
  const dob = field(formData, "dateOfBirth");
  const gender = resolveImmutableGender(existingGender, field(formData, "gender"));
  if (!gender || !dob) return "MISSING";

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "MISSING";
  if (calcAge(birthDate) < 18) return "AGE";

  const fullName = field(formData, "fullName");
  const district = field(formData, "district");
  const upazila = field(formData, "upazila");
  const profession = field(formData, "profession");
  const education = field(formData, "education");
  const maritalStatus = field(formData, "maritalStatus");
  const height = field(formData, "height");
  const weight = field(formData, "weight");
  const childrenStatus = field(formData, "childrenStatus");
  const familyDetails = field(formData, "familyDetails");
  const bio = field(formData, "bio");
  const nameHidden = formData.get("nameHidden") === "on";

  const completionScore = computeCompletion([
    gender, birthDate, district, upazila, profession, education,
    maritalStatus, bio, height, weight, childrenStatus, familyDetails,
  ]);

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      fullName: fullName || null,
      gender,
      dateOfBirth: birthDate,
      district: district || null,
      upazila: upazila || null,
      profession: profession || null,
      education: education || null,
      maritalStatus: maritalStatus || null,
      height: height || null,
      weight: weight || null,
      childrenStatus: childrenStatus || null,
      familyDetails: familyDetails || null,
      bio: bio || null,
      nameHidden,
      completionScore,
    },
  });

  revalidatePath(PROFILE_EDIT, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  return "OK";
}
