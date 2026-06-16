/**
 * Tiny className combiner — filters falsy values and joins.
 * (Avoids pulling in clsx/tailwind-merge; the project uses plain Tailwind.)
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a date with English numerals/month in every locale, so dates stay
 * consistent with the rest of our numbers (Inter / Latin digits) even in bn.
 */
export function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Profile completion percentage based purely on provided data: the share of
 * the given fields that are present (non-empty). Round to a whole percent.
 */
export function computeCompletion(values: Array<unknown>): number {
  if (values.length === 0) return 0;
  const filled = values.filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== "",
  ).length;
  return Math.round((filled / values.length) * 100);
}

/** Whole-year age from a date of birth. */
export function calcAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
