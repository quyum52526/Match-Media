import {
  MATCH_WEIGHTS,
  MAX_MATCH_SCORE,
  AGE_MATCH_TOLERANCE,
} from "./weights";

/**
 * The preference vector we score candidates against. Fields are optional so a
 * partially-completed profile (or a filter-only preference) still scores what
 * it can — a missing preferred value simply contributes no points.
 */
export interface MatchPreference {
  age: number;
  district?: string | null;
  education?: string | null;
  profession?: string | null;
  maritalStatus?: string | null;
}

/** The candidate attributes needed to score a profile. Cheap to `select`. */
export interface MatchCandidate {
  age: number;
  district?: string | null;
  education?: string | null;
  profession?: string | null;
  maritalStatus?: string | null;
}

/**
 * Pure, side-effect-free weighted match score. No DB, no I/O — trivially
 * unit-testable and reusable whether we score in JS (current) or ever port the
 * expression to SQL. Higher is better; 0 means nothing lined up.
 */
export function scoreCandidate(
  pref: MatchPreference,
  candidate: MatchCandidate,
): number {
  const w = MATCH_WEIGHTS;
  let score = 0;

  if (pref.district && candidate.district === pref.district) {
    score += w.district;
  }
  if (Math.abs(pref.age - candidate.age) <= AGE_MATCH_TOLERANCE) {
    score += w.ageRange;
  }
  if (pref.education && candidate.education === pref.education) {
    score += w.education;
  }
  if (pref.profession && candidate.profession === pref.profession) {
    score += w.profession;
  }
  if (pref.maritalStatus && candidate.maritalStatus === pref.maritalStatus) {
    score += w.maritalStatus;
  }

  return score;
}

/** Convenience: express a raw score as a 0–100 "match %" for display. */
export function toMatchPercent(score: number): number {
  return MAX_MATCH_SCORE === 0
    ? 0
    : Math.round((score / MAX_MATCH_SCORE) * 100);
}
