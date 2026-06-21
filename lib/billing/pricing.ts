// Pure billing math — no DB, no I/O. Unit-test with `npx tsx`.
// All money is integer POISHA (1 BDT = 100 poisha).

import type { DiscountType } from "@prisma/client";

export interface PricedOrder {
  baseAmount: number; // pre-discount, poisha
  discountAmount: number; // poisha
  finalAmount: number; // charged, poisha (0 => skip gateway)
}

/**
 * Discount in poisha for a coupon against a base price.
 * PERCENT clamps the rate to 0–100; FIXED floors at 0. The result is always
 * clamped to [0, base] so an order can never go negative or "owe" the user.
 */
export function computeDiscount(
  base: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (base <= 0) return 0;

  let discount: number;
  if (discountType === "PERCENT") {
    const pct = Math.min(Math.max(discountValue, 0), 100);
    discount = Math.round((base * pct) / 100);
  } else {
    discount = Math.max(discountValue, 0);
  }
  return Math.min(discount, base);
}

/** Price an order given a base amount and an optional coupon. */
export function priceOrder(
  base: number,
  coupon?: { discountType: DiscountType; discountValue: number } | null,
): PricedOrder {
  const discountAmount = coupon
    ? computeDiscount(base, coupon.discountType, coupon.discountValue)
    : 0;
  return { baseAmount: base, discountAmount, finalAmount: base - discountAmount };
}

/**
 * Whether the user has active Pro access.
 *
 * `proExpiresAt` is the source of truth: if set, access is active strictly while
 * it is in the future (so it lapses the instant it passes — no cron required for
 * correctness). If `proExpiresAt` is null, we fall back to the `isPro` flag,
 * which represents a perpetual/admin-granted membership with no expiry.
 */
export function isProActive(
  user: { isPro?: boolean | null; proExpiresAt?: Date | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!user) return false;
  if (user.proExpiresAt) return user.proExpiresAt.getTime() > now.getTime();
  return Boolean(user.isPro);
}

/**
 * Renewal stacking: a new subscription begins at the later of `now` and the
 * user's current end date, so renewing early extends rather than overwrites.
 */
export function nextSubscriptionStart(
  currentEndsAt: Date | null | undefined,
  now: Date = new Date(),
): Date {
  if (currentEndsAt && currentEndsAt.getTime() > now.getTime()) return currentEndsAt;
  return now;
}

/** End date = start + durationDays (whole days). */
export function addDays(start: Date, durationDays: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end;
}

/**
 * Format poisha as a Taka amount with English digits + grouping (no decimals
 * for whole Taka). 120000 -> "1,200"; 90000 -> "900". Numerals stay English in
 * both locales per the app's i18n rule — pair with a localized "৳"/"BDT" label.
 */
export function formatTaka(poisha: number): string {
  const taka = poisha / 100;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(taka) ? 0 : 2,
  }).format(taka);
}

/** Format an invoice number as MM-YYYYMMDD-#### (seq is the day's 1-based count). */
export function formatInvoiceNo(date: Date, seq: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `MM-${y}${m}${d}-${String(seq).padStart(4, "0")}`;
}
