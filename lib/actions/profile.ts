"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calcAge, computeCompletion } from "@/lib/utils";
import { getViewerId } from "@/lib/session";

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

  const gender = field(formData, "gender");
  const dob = field(formData, "dateOfBirth");
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

  // Completion is derived from the same 12 fields the detail page uses.
  const completionScore = computeCompletion([
    gender,
    birthDate,
    district,
    upazila,
    profession,
    education,
    maritalStatus,
    bio,
    height,
    weight,
    childrenStatus,
    familyDetails,
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
