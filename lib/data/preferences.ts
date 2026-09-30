import "server-only";
import { prisma } from "@/lib/prisma";
import { heightsInRange } from "@/lib/constants/profileOptions";
import type { MatchPreference } from "@/lib/matching/score";
import type { EditablePartnerPreference } from "@/components/profile/types";

/** A PartnerPreference row as the matcher consumes it (all dimensions optional). */
export type PartnerPreferenceRow = {
  minAge: number | null;
  maxAge: number | null;
  minHeight: string | null;
  maxHeight: string | null;
  religions: string[];
  sects: string[];
  districts: string[];
  professions: string[];
  educations: string[];
  maritalStatuses: string[];
};

/** The columns the matcher needs — kept in one place so scans stay cheap. */
export const PARTNER_PREFERENCE_SELECT = {
  minAge: true,
  maxAge: true,
  minHeight: true,
  maxHeight: true,
  religions: true,
  sects: true,
  districts: true,
  professions: true,
  educations: true,
  maritalStatuses: true,
} as const;

const EMPTY_PREFERENCE: EditablePartnerPreference = {
  minAge: "",
  maxAge: "",
  minHeight: "",
  maxHeight: "",
  religions: [],
  sects: [],
  districts: [],
  professions: [],
  educations: [],
  maritalStatuses: [],
};

/**
 * The viewer's own partner preferences, shaped for the settings form. Returns
 * blanks when none were saved yet (so the form doubles as first-time setup) and
 * when the viewer has no profile at all.
 */
export async function getEditablePartnerPreference(
  viewerId: string,
): Promise<EditablePartnerPreference> {
  const profile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { partnerPreference: { select: PARTNER_PREFERENCE_SELECT } },
  });
  const pref = profile?.partnerPreference;
  if (!pref) return { ...EMPTY_PREFERENCE };

  return {
    minAge: pref.minAge != null ? String(pref.minAge) : "",
    maxAge: pref.maxAge != null ? String(pref.maxAge) : "",
    minHeight: pref.minHeight ?? "",
    maxHeight: pref.maxHeight ?? "",
    religions: pref.religions,
    sects: pref.sects,
    districts: pref.districts,
    professions: pref.professions,
    educations: pref.educations,
    maritalStatuses: pref.maritalStatuses,
  };
}

/**
 * Fold a saved PartnerPreference into the matcher's preference vector as the
 * list-valued dimensions. The scalar (own-profile) values stay untouched — they
 * remain the fallback used by `dimensionMatches` whenever a list is empty.
 *
 * `minHeight`/`maxHeight` are resolved here (not in the scorer) so the string
 * height range is expanded exactly once per recommendation request.
 */
export function applyPartnerPreference(
  base: MatchPreference,
  pref: PartnerPreferenceRow | null | undefined,
): MatchPreference {
  if (!pref) return base;
  return {
    ...base,
    minAge: pref.minAge,
    maxAge: pref.maxAge,
    religions: pref.religions,
    sects: pref.sects,
    districts: pref.districts,
    professions: pref.professions,
    educations: pref.educations,
    maritalStatuses: pref.maritalStatuses,
    heights:
      pref.minHeight || pref.maxHeight
        ? heightsInRange(pref.minHeight ?? undefined, pref.maxHeight ?? undefined)
        : undefined,
  };
}
