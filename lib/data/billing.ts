import "server-only";
import { prisma } from "@/lib/prisma";
import { computeDiscount, isProActive, checkDailyLimit } from "@/lib/billing";
import { resolveTriggeredCoupon } from "@/lib/billing/coupons";
import { FREE_DAILY_LIMIT } from "@/lib/constants/plans";

/** A plan as shown on the /pro page, with any auto-applied promo resolved. */
export interface CheckoutPlan {
  code: string;
  name: string;
  durationDays: number;
  /** Standard price, poisha. */
  baseAmount: number;
  /** Discount the viewer would get right now (renewal promo), poisha. */
  discountAmount: number;
  /** Price the viewer would actually pay, poisha. */
  finalAmount: number;
  currency: string;
  /** The promo code applied, if any (e.g. FIRSTYEAR90). */
  couponCode: string | null;
}

/**
 * Active plans priced for THIS viewer. If they're eligible for the RENEWAL
 * promo (e.g. expired user who hasn't used it), the discount is folded into
 * each plan so the UI can show "9000 → 900 BDT" with the standard price struck.
 */
export async function getCheckoutPlans(viewerId: string): Promise<CheckoutPlan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const result: CheckoutPlan[] = [];
  for (const plan of plans) {
    const coupon = await resolveTriggeredCoupon(viewerId, "RENEWAL", plan.code);
    const discountAmount = coupon
      ? computeDiscount(plan.priceAmount, coupon.discountType, coupon.discountValue)
      : 0;
    result.push({
      code: plan.code,
      name: plan.name,
      durationDays: plan.durationDays,
      baseAmount: plan.priceAmount,
      discountAmount,
      finalAmount: plan.priceAmount - discountAmount,
      currency: plan.currency,
      couponCode: coupon?.code ?? null,
    });
  }
  return result;
}

export interface ViewerProStatus {
  isPro: boolean;
  proExpiresAt: Date | null;
}

/** Pro status for the current viewer (expiry-aware). */
export async function getViewerProStatus(viewerId: string): Promise<ViewerProStatus> {
  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true, proExpiresAt: true },
  });
  return {
    isPro: isProActive(user),
    proExpiresAt: user?.proExpiresAt ?? null,
  };
}

export interface PhotoQuota {
  unlimited: boolean;
  /** New photo requests left today (free tier); equals `limit` for Pro. */
  remaining: number;
  limit: number;
}

/** The viewer's remaining photo-request quota for today (Pro = unlimited). */
export async function getPhotoRequestQuota(viewerId: string): Promise<PhotoQuota> {
  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true, proExpiresAt: true },
  });
  const check = await checkDailyLimit(
    { id: viewerId, isPro: user?.isPro, proExpiresAt: user?.proExpiresAt },
    "PHOTO_REQUEST",
  );
  return {
    unlimited: check.unlimited,
    remaining: check.unlimited ? FREE_DAILY_LIMIT : check.remaining,
    limit: FREE_DAILY_LIMIT,
  };
}

/** Fetch an order that belongs to the viewer (404-safe ownership check). */
export async function getOrderForViewer(orderId: string, viewerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== viewerId) return null;
  return order;
}
