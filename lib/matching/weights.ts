/**
 * Weighted-scoring configuration for the "Recommended for You" matchmaker.
 *
 * Single source of truth for how much each attribute contributes to a match
 * score. Product can tune these numbers without touching the scoring logic
 * (lib/matching/score.ts) or the retrieval layer (lib/data/recommend.ts).
 */
export const MATCH_WEIGHTS = {
  /** Same district — the strongest locality signal. */
  district: 5,
  /** Candidate's age falls within tolerance of the preferred age. */
  ageRange: 3,
  /** Same education level. */
  education: 2,
  /** Same profession. */
  profession: 2,
  /** Same marital status. */
  maritalStatus: 1,
} as const;

/** Max attainable score — handy for normalising to a 0–100 "match %". */
export const MAX_MATCH_SCORE = Object.values(MATCH_WEIGHTS).reduce(
  (a, b) => a + b,
  0,
);

/** ±years around the preferred age that still counts as an age-range match. */
export const AGE_MATCH_TOLERANCE = 3;

/**
 * ±years hard gate for the candidate scan. Bounds how many rows we score at
 * all, so latency stays flat as the user base grows. Wider than the match
 * tolerance so near-misses still surface (just scored lower).
 */
export const AGE_GATE_WINDOW = 10;

/** How many recommended profiles to return. */
export const RECOMMENDED_LIMIT = 20;

/**
 * Minimum match % for the card badge to render. Below this, the profile is
 * still recommended (it out-scored others) but we hide the number rather than
 * show an unflattering "8% Match". Purely presentational — tune to taste.
 */
export const MATCH_BADGE_MIN_PERCENT = 40;
