"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calcAge, computeCompletion, resolveImmutableGender } from "@/lib/utils";
import { getViewerId } from "@/lib/session";
import { GENDERS, sectsFor } from "@/lib/constants/profileOptions";
import { hasFamilyInfo } from "@/lib/data/familyDetails";

const PROFILE_EDIT = "/[locale]/profile/edit";
const BROWSE = "/[locale]/browse";
const PROFILE = "/[locale]/profiles/[id]";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/**
 * Keep `sect` consistent with `religion`: a sect is only persisted when it is a
 * valid option for the submitted religion. Switching religion therefore clears a
 * stale sect instead of leaving an impossible pair (e.g. Islam + "Catholic") in
 * the DB, where the matcher would score it as a real signal.
 */
function sectFor(religion: string, submitted: string): string {
  if (!religion || !submitted) return "";
  const valid = sectsFor(religion);
  return valid.some((o) => o.value === submitted) ? submitted : "";
}

/**
 * Parse a sibling count input. Blank stays null (unknown, not zero), and
 * anything non-numeric or negative is rejected the same way, so a typo can
 * never land as a bogus count. Capped at 30 — past that it is bad input.
 */
function countField(formData: FormData, name: string): number | null {
  const raw = field(formData, name);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 30) return null;
  return n;
}

/**
 * The structured family + education/career fields, read once and shared by the
 * self-edit and agency-edit paths so neither can drift from the other.
 */
function familyAndCareerFields(formData: FormData) {
  return {
    fatherProfession: field(formData, "fatherProfession") || null,
    fatherStatus: field(formData, "fatherStatus") || null,
    motherProfession: field(formData, "motherProfession") || null,
    motherStatus: field(formData, "motherStatus") || null,
    numberOfBrothers: countField(formData, "numberOfBrothers"),
    brothersDetails: field(formData, "brothersDetails") || null,
    numberOfSisters: countField(formData, "numberOfSisters"),
    sistersDetails: field(formData, "sistersDetails") || null,
    paternalBackground: field(formData, "paternalBackground") || null,
    maternalBackground: field(formData, "maternalBackground") || null,
    familyClass: field(formData, "familyClass") || null,
    familyType: field(formData, "familyType") || null,
    educationInstitute: field(formData, "educationInstitute") || null,
    educationMajor: field(formData, "educationMajor") || null,
  };
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
  const religion = field(formData, "religion");
  // Sect is only meaningful for the chosen religion; drop a stale value left over
  // from a previously selected religion rather than persisting a mismatch.
  const sect = sectFor(religion, field(formData, "sect"));
  const caste = field(formData, "caste");
  const diet = field(formData, "diet");
  const smokingStatus = field(formData, "smokingStatus");
  const height = field(formData, "height");
  const weight = field(formData, "weight");
  const childrenStatus = field(formData, "childrenStatus");
  const familyDetails = field(formData, "familyDetails");
  const family = familyAndCareerFields(formData);
  const bio = field(formData, "bio");
  const nameHidden = formData.get("nameHidden") === "on";

  const completionScore = computeCompletion([
    gender, birthDate, district, upazila, profession, education,
    maritalStatus, bio, height, weight, childrenStatus,
    // The structured fields count too — a member who filled those but left the
    // free-text note empty has still described their family.
    hasFamilyInfo({ ...family, familyDetails }) ? "1" : "",
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
    religion: religion || null,
    sect: sect || null,
    caste: caste || null,
    diet: diet || null,
    smokingStatus: smokingStatus || null,
    height: height || null,
    weight: weight || null,
    childrenStatus: childrenStatus || null,
    familyDetails: familyDetails || null,
    ...family,
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
  const religion = field(formData, "religion");
  // Sect is only meaningful for the chosen religion; drop a stale value left over
  // from a previously selected religion rather than persisting a mismatch.
  const sect = sectFor(religion, field(formData, "sect"));
  const caste = field(formData, "caste");
  const diet = field(formData, "diet");
  const smokingStatus = field(formData, "smokingStatus");
  const height = field(formData, "height");
  const weight = field(formData, "weight");
  const childrenStatus = field(formData, "childrenStatus");
  const familyDetails = field(formData, "familyDetails");
  const family = familyAndCareerFields(formData);
  const bio = field(formData, "bio");
  const nameHidden = formData.get("nameHidden") === "on";

  const completionScore = computeCompletion([
    gender, birthDate, district, upazila, profession, education,
    maritalStatus, bio, height, weight, childrenStatus,
    // The structured fields count too — a member who filled those but left the
    // free-text note empty has still described their family.
    hasFamilyInfo({ ...family, familyDetails }) ? "1" : "",
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
      religion: religion || null,
      sect: sect || null,
      caste: caste || null,
      diet: diet || null,
      smokingStatus: smokingStatus || null,
      height: height || null,
      weight: weight || null,
      childrenStatus: childrenStatus || null,
      familyDetails: familyDetails || null,
      ...family,
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
