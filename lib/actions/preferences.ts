"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import {
  EDUCATION_LEVELS,
  HEIGHTS,
  MARITAL_STATUSES,
  PROFESSIONS,
  RELIGIONS,
  ALL_SECTS,
} from "@/lib/constants/profileOptions";
// The geo option set the UI submits from (canonical English district names).
import { DISTRICTS } from "@/lib/constants/bdGeo";

const BROWSE = "/[locale]/browse";
const PREFERENCES = "/[locale]/profile/preferences";

/** Hard bounds for the age range — mirrors the 18+ rule enforced on profiles. */
const MIN_ALLOWED_AGE = 18;
const MAX_ALLOWED_AGE = 100;

/** Status codes the UI localizes under `Preferences.errors`. */
export type PreferenceResult = { ok: true } | { ok: false; error: string };

const ok: PreferenceResult = { ok: true };
const err = (error: string): PreferenceResult => ({ ok: false, error });

export interface PartnerPreferenceInput {
  minAge?: number | null;
  maxAge?: number | null;
  minHeight?: string | null;
  maxHeight?: string | null;
  religions?: string[];
  sects?: string[];
  districts?: string[];
  professions?: string[];
  educations?: string[];
  maritalStatuses?: string[];
}

/**
 * Keep only values that exist in our canonical option set, de-duplicated.
 * Preferences are queried against canonical DB values, so an arbitrary string
 * from a tampered client payload could never match anything — dropping it keeps
 * the stored preference honest instead of silently matching nothing.
 */
function sanitizeList(
  submitted: string[] | undefined,
  allowed: readonly string[],
): string[] {
  if (!submitted?.length) return [];
  const valid = submitted
    .map((v) => v.trim())
    .filter((v) => v && allowed.includes(v));
  return [...new Set(valid)];
}

/** Optional integer age, clamped to the allowed window; invalid input -> null. */
function parseAge(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const age = Math.trunc(value);
  if (age < MIN_ALLOWED_AGE || age > MAX_ALLOWED_AGE) return null;
  return age;
}

/** Optional canonical height label; anything unrecognized -> null. */
function parseHeight(value: string | null | undefined): string | null {
  const height = value?.trim();
  if (!height) return null;
  return HEIGHTS.includes(height) ? height : null;
}

const VALUES = (options: readonly { value: string }[]) =>
  options.map((o) => o.value);

/**
 * Create or replace the viewer's partner preferences.
 *
 * These are ranking inputs only — they steer `getRecommendedProfiles` and never
 * widen what the viewer may see, so no privacy or access gate depends on them.
 * Requires an authenticated viewer who already has a Profile (preferences hang
 * off the profile, not the user).
 */
export async function savePartnerPreferences(
  input: PartnerPreferenceInput,
): Promise<PreferenceResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return err("UNAUTH");

  const profile = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: { id: true },
  });
  if (!profile) return err("NO_PROFILE");

  const minAge = parseAge(input.minAge);
  const maxAge = parseAge(input.maxAge);
  if (minAge != null && maxAge != null && minAge > maxAge) {
    return err("AGE_RANGE");
  }

  const minHeight = parseHeight(input.minHeight);
  const maxHeight = parseHeight(input.maxHeight);
  // Heights are strings, so compare by index in the canonical ascending list
  // rather than lexically ("5'10\"" sorts before "5'6\"").
  if (
    minHeight &&
    maxHeight &&
    HEIGHTS.indexOf(minHeight) > HEIGHTS.indexOf(maxHeight)
  ) {
    return err("HEIGHT_RANGE");
  }

  const data = {
    minAge,
    maxAge,
    minHeight,
    maxHeight,
    religions: sanitizeList(input.religions, VALUES(RELIGIONS)),
    sects: sanitizeList(input.sects, VALUES(ALL_SECTS)),
    districts: sanitizeList(input.districts, VALUES(DISTRICTS)),
    professions: sanitizeList(input.professions, VALUES(PROFESSIONS)),
    educations: sanitizeList(input.educations, VALUES(EDUCATION_LEVELS)),
    maritalStatuses: sanitizeList(input.maritalStatuses, VALUES(MARITAL_STATUSES)),
  };

  await prisma.partnerPreference.upsert({
    where: { profileId: profile.id },
    create: { profileId: profile.id, ...data },
    update: data,
  });

  // Recommendations are derived from these, so the browse strip must re-render.
  revalidatePath(BROWSE, "page");
  revalidatePath(PREFERENCES, "page");
  return ok;
}
