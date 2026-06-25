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

/**
 * Gender is IMMUTABLE once chosen. Given the currently-stored gender and a
 * newly-submitted one, returns the value that must be persisted: the stored
 * value always wins (any submission is ignored once a gender exists), and only
 * a first-time setup (no stored gender) accepts the submission. This is the
 * security boundary for the gender-based features — the locked edit UI is just
 * convenience on top of it.
 */
export function resolveImmutableGender(
  stored: string | null | undefined,
  submitted: string,
): string {
  const locked = stored?.trim();
  return locked ? locked : submitted.trim();
}

/**
 * Normalize a Bangladeshi mobile number to canonical international form
 * (`8801XXXXXXXXX`). Accepts the common inputs — `01XXXXXXXXX`, `8801XXXXXXXXX`,
 * `+8801XXXXXXXXX`, with spaces/dashes — and validates the operator digit
 * (013–019). Returns null when it isn't a valid BD mobile, so callers can reject.
 */
export function normalizeBdMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let national: string;
  if (digits.length === 11 && digits.startsWith("01")) {
    national = digits; // 01XXXXXXXXX
  } else if (digits.length === 13 && digits.startsWith("880")) {
    national = "0" + digits.slice(3); // 8801... -> 01...
  } else {
    return null;
  }
  // 01[3-9] + 8 digits is the valid BD mobile shape.
  if (!/^01[3-9]\d{8}$/.test(national)) return null;
  return "88" + national;
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
