import "server-only";
import { prisma } from "@/lib/prisma";
import { computeCompletion } from "@/lib/utils";

/**
 * The fields that make up the completion score. Each key doubles as the
 * `ProfileEdit.fields.*` i18n key, so the banner can localize the "still
 * missing" list without a second mapping. `gender`/`dateOfBirth` are required
 * at registration, so in practice they're never reported as missing.
 */
export const COMPLETION_FIELDS = [
  "gender",
  "dateOfBirth",
  "district",
  "upazila",
  "profession",
  "education",
  "maritalStatus",
  "bio",
  "height",
  "weight",
  "childrenStatus",
  "familyDetails",
] as const;

export type CompletionField = (typeof COMPLETION_FIELDS)[number];

export interface ProfileCompletion {
  /** 0–100, recomputed from the same fields the stored score uses. */
  score: number;
  /** `ProfileEdit.fields.*` keys still empty, in display order. */
  missing: CompletionField[];
  hasProfile: boolean;
}

function isFilled(v: unknown): boolean {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

/**
 * Completion summary for the current user's profile: the percentage plus which
 * fields are still empty, so the UI can nudge the user toward 100%.
 */
export async function getProfileCompletion(
  viewerId: string,
): Promise<ProfileCompletion> {
  const p = await prisma.profile.findUnique({ where: { userId: viewerId } });
  if (!p) {
    return { score: 0, missing: [...COMPLETION_FIELDS], hasProfile: false };
  }

  const values: Record<CompletionField, unknown> = {
    gender: p.gender,
    dateOfBirth: p.dateOfBirth,
    district: p.district,
    upazila: p.upazila,
    profession: p.profession,
    education: p.education,
    maritalStatus: p.maritalStatus,
    bio: p.bio,
    height: p.height,
    weight: p.weight,
    childrenStatus: p.childrenStatus,
    familyDetails: p.familyDetails,
  };

  const missing = COMPLETION_FIELDS.filter((k) => !isFilled(values[k]));
  const score = computeCompletion(COMPLETION_FIELDS.map((k) => values[k]));
  return { score, missing, hasProfile: true };
}
