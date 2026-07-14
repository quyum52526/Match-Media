import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { scoreCandidate, type MatchPreference } from "@/lib/matching/score";
import { AGE_GATE_WINDOW, RECOMMENDED_LIMIT } from "@/lib/matching/weights";
import {
  BROWSE_CARD_INCLUDE,
  hydrateProfileCards,
  type SearchFilters,
} from "./profiles";
import type { ProfileSummary } from "@/components/profile/types";

/** A card plus its computed match score (higher = better fit). */
export interface RecommendedProfile extends ProfileSummary {
  matchScore: number;
}

/**
 * Result of a recommendation lookup.
 *  • "scored"   — personalised, weighted matches (each carries a real matchScore).
 *  • "fallback" — no scored matches, so the most-complete opposite-gender
 *                 candidates instead (matchScore 0 → no "% Match" badge). Lets
 *                 the caller label the section honestly instead of showing an
 *                 empty state.
 * An empty `profiles` with kind "scored" means the viewer has no profile to
 * personalise against (the caller can show a "complete your profile" prompt).
 */
export interface RecommendationResult {
  kind: "scored" | "fallback";
  profiles: RecommendedProfile[];
}

/** A Date `years` ago from now (age <-> dateOfBirth conversion). */
function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/** Matrimonial default: suggest the opposite gender. Unknown -> no gender gate. */
function oppositeGender(gender: string | null | undefined): string | null {
  if (gender === "Male") return "Female";
  if (gender === "Female") return "Male";
  return null;
}

/**
 * Resolve the preferred age from the hybrid inputs: an explicit filter range
 * wins (use its midpoint), otherwise fall back to the viewer's own age.
 */
function resolvePreferredAge(
  filters: SearchFilters,
  viewerAge: number,
): number {
  const { minAge, maxAge } = filters;
  if (minAge != null && maxAge != null) return Math.round((minAge + maxAge) / 2);
  if (minAge != null) return minAge;
  if (maxAge != null) return maxAge;
  return viewerAge;
}

/**
 * Fallback recommendations: the most-complete recent candidates, unscored
 * (matchScore 0 -> no "% Match" badge). Used when personalised scoring yields
 * nothing — either a sparse/narrow scored pass, or a viewer with no profile to
 * score against (MEDIA/ADMIN/PARENTS). `preferredGender` gates the set when
 * known, otherwise the fallback spans everyone.
 */
async function fallbackRecommendations(
  viewerId: string,
  candidateArm: Prisma.ProfileWhereInput,
  preferredGender: string | null,
): Promise<RecommendationResult> {
  const where: Prisma.ProfileWhereInput = { ...candidateArm };
  if (preferredGender) where.gender = preferredGender;
  const rows = await prisma.profile.findMany({
    where,
    orderBy: [{ completionScore: "desc" }, { createdAt: "desc" }],
    take: RECOMMENDED_LIMIT,
    include: BROWSE_CARD_INCLUDE,
  });
  const cards = await hydrateProfileCards(rows, viewerId);
  return {
    kind: "fallback",
    profiles: cards.map((card) => ({ ...card, matchScore: 0 })),
  };
}

/**
 * "Recommended for You" — the top {@link RECOMMENDED_LIMIT} profiles ranked by
 * weighted match score.
 *
 * HYBRID preferences: each dimension is taken from the viewer's own profile,
 * overridden by an active search filter when present. So recommendations are
 * always available (from the profile) and sharpen as the user filters.
 *
 * PERFORMANCE — two passes so cost stays flat as the table grows:
 *   1. A cheap, index-backed scan (gender + age window via @@index([gender,
 *      dateOfBirth])) selecting only the ~7 scoring columns. Scored in-memory.
 *   2. Hydrate ONLY the top 20 through the shared card pipeline, so expensive
 *      URL signing never touches the full candidate set.
 *
 * Never returns an empty section: viewers with no profile to personalise
 * against (MEDIA/ADMIN/PARENTS) get a gender-agnostic "fallback" set of the
 * most-complete recent candidates, so the carousel is populated for everyone.
 */
export async function getRecommendedProfiles(
  viewerId: string,
  filters: SearchFilters = {},
): Promise<RecommendationResult> {
  // Candidate visibility mirrors the browse feed for a regular viewer:
  //   • managed profiles (userId = null), OR
  //   • self-registered candidates (accountCategory = "SELF"), excluding self.
  const candidateArm: Prisma.ProfileWhereInput = {
    OR: [
      { userId: null },
      { userId: { not: null }, NOT: { userId: viewerId }, user: { accountCategory: "SELF" } },
    ],
  };

  // The viewer's own profile is the preference baseline. Managers/admins have
  // none -> show the gender-agnostic fallback instead of nothing.
  const viewer = await prisma.profile.findUnique({
    where: { userId: viewerId },
    select: {
      gender: true,
      dateOfBirth: true,
      district: true,
      education: true,
      profession: true,
      maritalStatus: true,
    },
  });
  if (!viewer) return fallbackRecommendations(viewerId, candidateArm, null);

  const viewerAge = calcAge(viewer.dateOfBirth);
  const preferredAge = resolvePreferredAge(filters, viewerAge);
  const preferredGender = filters.gender ?? oppositeGender(viewer.gender);

  // Hybrid preference vector: filter value overrides the profile value.
  const preference: MatchPreference = {
    age: preferredAge,
    district: filters.district ?? viewer.district,
    education: filters.education ?? viewer.education,
    profession: filters.profession ?? viewer.profession,
    maritalStatus: filters.maritalStatus ?? viewer.maritalStatus,
  };

  // Index-backed gate: opposite gender + a generous age window. Bounds how many
  // rows we score at all. Age >= lo .. <= hi  ->  dob in [yearsAgo(hi+1), yearsAgo(lo)].
  const ageLo = Math.max(18, preferredAge - AGE_GATE_WINDOW);
  const ageHi = preferredAge + AGE_GATE_WINDOW;
  const where: Prisma.ProfileWhereInput = {
    ...candidateArm,
    dateOfBirth: { gte: yearsAgo(ageHi + 1), lte: yearsAgo(ageLo) },
  };
  if (preferredGender) where.gender = preferredGender;

  // PASS 1 — cheap scan: only the columns scoring needs (+ tie-break fields).
  const candidates = await prisma.profile.findMany({
    where,
    select: {
      id: true,
      district: true,
      dateOfBirth: true,
      education: true,
      profession: true,
      maritalStatus: true,
      isVerified: true,
      createdAt: true,
    },
  });

  const ranked = candidates
    .map((c) => ({
      id: c.id,
      isVerified: c.isVerified,
      createdAt: c.createdAt,
      score: scoreCandidate(preference, {
        age: calcAge(c.dateOfBirth),
        district: c.district,
        education: c.education,
        profession: c.profession,
        maritalStatus: c.maritalStatus,
      }),
    }))
    .filter((c) => c.score > 0) // no shared signal -> not a recommendation
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.isVerified) - Number(a.isVerified) || // prefer verified
        b.createdAt.getTime() - a.createdAt.getTime(), // then newer
    )
    .slice(0, RECOMMENDED_LIMIT);

  if (ranked.length === 0) {
    // No scored matches (sparse profile or narrow criteria). Rather than vanish,
    // fall back to the most-complete opposite-gender candidates so there's still
    // someone to explore.
    return fallbackRecommendations(viewerId, candidateArm, preferredGender);
  }

  const scoreById = new Map(ranked.map((r) => [r.id, r.score]));

  // PASS 2 — hydrate ONLY the winners through the shared card pipeline.
  const rows = await prisma.profile.findMany({
    where: { id: { in: ranked.map((r) => r.id) } },
    include: BROWSE_CARD_INCLUDE,
  });
  // Preserve score order (findMany's `in` does not guarantee ordering).
  rows.sort(
    (a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0),
  );

  const cards = await hydrateProfileCards(rows, viewerId);
  // hydrateProfileCards preserves input order, so cards[i] aligns with rows[i].
  return {
    kind: "scored",
    profiles: cards.map((card, i) => ({
      ...card,
      matchScore: scoreById.get(rows[i].id) ?? 0,
    })),
  };
}
