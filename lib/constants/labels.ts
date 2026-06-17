import {
  GENDERS,
  PROFESSIONS,
  EDUCATION_LEVELS,
  MARITAL_STATUSES,
} from "./profileOptions";
import { DISTRICTS, ALL_UPAZILAS } from "./bdGeo";

/**
 * Global lookup: canonical English value -> Bengali label. Built from every
 * standardized option set. Values are unique across categories (and where a
 * name repeats, the Bengali label is the same), so one flat map is safe.
 */
const BN_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...GENDERS,
    ...PROFESSIONS,
    ...EDUCATION_LEVELS,
    ...MARITAL_STATUSES,
    ...DISTRICTS,
    ...ALL_UPAZILAS,
  ].map((o) => [o.value, o.bn]),
);

/**
 * Display a canonical (English) enum value in the active locale. English locale
 * shows the value as-is; Bengali shows the mapped label (falling back to the
 * raw value for legacy/free-text data with no mapping).
 */
export function localize(value: string, locale: string): string {
  if (!value) return value;
  return locale === "bn" ? (BN_LABELS[value] ?? value) : value;
}
