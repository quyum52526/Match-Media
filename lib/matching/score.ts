import {
  MATCH_WEIGHTS,
  MAX_MATCH_SCORE,
  AGE_MATCH_TOLERANCE,
} from "./weights";

/**
 * The preference vector we score candidates against.
 *
 * Every dimension exists in two forms and the LIST always wins when non-empty:
 *   - a list (`districts`, `religions`, …) from the profile's explicit
 *     PartnerPreference — "any of these is acceptable";
 *   - a scalar (`district`, `religion`, …) implied by the viewer's own profile —
 *     the homophily fallback used when no list was set.
 * Fields are optional so a partially-completed profile still scores what it can;
 * a dimension with neither a list nor a scalar simply contributes no points.
 */
export interface MatchPreference {
  /** Preferred age midpoint, used when no explicit min/max range is set. */
  age: number;
  /** Explicit accepted age range (inclusive). Overrides `age` + tolerance. */
  minAge?: number | null;
  maxAge?: number | null;

  religion?: string | null;
  religions?: readonly string[];
  sect?: string | null;
  sects?: readonly string[];
  district?: string | null;
  districts?: readonly string[];
  education?: string | null;
  educations?: readonly string[];
  profession?: string | null;
  professions?: readonly string[];
  maritalStatus?: string | null;
  maritalStatuses?: readonly string[];

  /**
   * Canonical height labels considered acceptable, pre-resolved from the
   * preference's min/max via `heightsInRange()`. Empty = no height preference.
   */
  heights?: readonly string[];
}

/** The candidate attributes needed to score a profile. Cheap to `select`. */
export interface MatchCandidate {
  age: number;
  religion?: string | null;
  sect?: string | null;
  district?: string | null;
  education?: string | null;
  profession?: string | null;
  maritalStatus?: string | null;
  height?: string | null;
}

/**
 * The religions this preference will accept: the explicit list when set,
 * otherwise the viewer's own religion (matrimonial default is same-religion).
 * `null` means no religion constraint at all — nothing is gated out.
 */
function acceptedReligions(pref: MatchPreference): readonly string[] | null {
  if (pref.religions && pref.religions.length > 0) return pref.religions;
  if (pref.religion) return [pref.religion];
  return null;
}

/**
 * Religion is a MANDATORY dimension, not a weighted one: a candidate of a
 * different religion is never a match, regardless of how well everything else
 * lines up.
 *
 * A candidate whose religion is UNSET is not gated out — legacy and
 * partially-completed profiles would otherwise disappear from every feed. They
 * simply earn no religion points, so a candidate who states a matching religion
 * always outranks one who states none.
 */
export function isReligionCompatible(
  pref: MatchPreference,
  candidate: MatchCandidate,
): boolean {
  const accepted = acceptedReligions(pref);
  if (!accepted) return true; // viewer expressed no religion constraint
  if (!candidate.religion) return true; // unknown ≠ incompatible
  return accepted.includes(candidate.religion);
}

/**
 * Score one dimension: the list wins when non-empty, else fall back to scalar
 * equality. A candidate value that is unset never scores.
 */
function dimensionMatches(
  list: readonly string[] | undefined,
  scalar: string | null | undefined,
  candidateValue: string | null | undefined,
): boolean {
  if (!candidateValue) return false;
  if (list && list.length > 0) return list.includes(candidateValue);
  return Boolean(scalar) && candidateValue === scalar;
}

/** Whether the candidate's age satisfies the preference (explicit range wins). */
function ageMatches(pref: MatchPreference, candidateAge: number): boolean {
  const { minAge, maxAge } = pref;
  if (minAge != null || maxAge != null) {
    if (minAge != null && candidateAge < minAge) return false;
    if (maxAge != null && candidateAge > maxAge) return false;
    return true;
  }
  return Math.abs(pref.age - candidateAge) <= AGE_MATCH_TOLERANCE;
}

/**
 * Pure, side-effect-free weighted match score. No DB, no I/O — trivially
 * unit-testable and reusable whether we score in JS (current) or ever port the
 * expression to SQL. Higher is better.
 *
 * Returns 0 for a religion mismatch (hard gate) and for a candidate with no
 * shared signal at all; `lib/data/recommend.ts` drops everything scoring 0.
 */
export function scoreCandidate(
  pref: MatchPreference,
  candidate: MatchCandidate,
): number {
  // Hard gate first — a different religion is disqualifying, not just costly.
  if (!isReligionCompatible(pref, candidate)) return 0;

  const w = MATCH_WEIGHTS;
  let score = 0;

  if (dimensionMatches(pref.religions, pref.religion, candidate.religion)) {
    score += w.religion;
  }
  if (dimensionMatches(pref.districts, pref.district, candidate.district)) {
    score += w.district;
  }
  if (ageMatches(pref, candidate.age)) {
    score += w.ageRange;
  }
  if (dimensionMatches(pref.educations, pref.education, candidate.education)) {
    score += w.education;
  }
  if (dimensionMatches(pref.professions, pref.profession, candidate.profession)) {
    score += w.profession;
  }
  if (dimensionMatches(pref.sects, pref.sect, candidate.sect)) {
    score += w.sect;
  }
  if (
    dimensionMatches(
      pref.maritalStatuses,
      pref.maritalStatus,
      candidate.maritalStatus,
    )
  ) {
    score += w.maritalStatus;
  }
  if (
    candidate.height &&
    pref.heights &&
    pref.heights.length > 0 &&
    pref.heights.includes(candidate.height)
  ) {
    score += w.height;
  }

  return score;
}

/** Convenience: express a raw score as a 0–100 "match %" for display. */
export function toMatchPercent(score: number): number {
  return MAX_MATCH_SCORE === 0
    ? 0
    : Math.round((score / MAX_MATCH_SCORE) * 100);
}
