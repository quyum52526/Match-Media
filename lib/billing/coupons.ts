// Dynamic coupon resolution. The lifecycle (SIGNUP / RENEWAL) drives which promo
// auto-applies, so promotions are pure data — change the DB row, not the code.

import type { Coupon, CouponTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Pure eligibility check: is this coupon usable right now, given how many times
 * the user has already redeemed it? Validity window, global cap, per-user cap,
 * and active flag are all enforced here.
 */
export function isCouponRedeemable(
  coupon: Pick<
    Coupon,
    | "isActive"
    | "validFrom"
    | "validUntil"
    | "maxRedemptions"
    | "redeemedCount"
    | "perUserLimit"
  >,
  userRedemptionCount: number,
  now: Date = new Date(),
): boolean {
  if (!coupon.isActive) return false;
  if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) return false;
  if (coupon.validUntil && coupon.validUntil.getTime() < now.getTime()) return false;
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return false;
  }
  if (coupon.perUserLimit != null && userRedemptionCount >= coupon.perUserLimit) {
    return false;
  }
  return true;
}

/**
 * Find the coupon to auto-apply for a lifecycle trigger and plan, for a given
 * user. Returns null when nothing applies (e.g. the user already used the
 * one-time promo). Plan-specific coupons win over any-plan ones.
 */
export async function resolveTriggeredCoupon(
  userId: string,
  trigger: CouponTrigger,
  planCode: string,
  now: Date = new Date(),
): Promise<Coupon | null> {
  const candidates = await prisma.coupon.findMany({
    where: {
      trigger,
      isActive: true,
      OR: [{ appliesToPlan: null }, { appliesToPlan: planCode }],
    },
    // Plan-specific first (non-null appliesToPlan sorts before null on desc).
    orderBy: { appliesToPlan: "desc" },
  });

  for (const coupon of candidates) {
    const userRedemptionCount = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (isCouponRedeemable(coupon, userRedemptionCount, now)) return coupon;
  }
  return null;
}

/** Resolve an explicitly typed coupon code (manual entry path), if redeemable. */
export async function resolveCouponByCode(
  userId: string,
  code: string,
  now: Date = new Date(),
): Promise<Coupon | null> {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return null;
  const userRedemptionCount = await prisma.couponRedemption.count({
    where: { couponId: coupon.id, userId },
  });
  return isCouponRedeemable(coupon, userRedemptionCount, now) ? coupon : null;
}
