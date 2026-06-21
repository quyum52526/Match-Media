// Order lifecycle: create (with snapshot + auto-coupon), then activate.
// Activation is idempotent and the ONLY place a Subscription / Pro access is
// granted — drive it from a server-verified IPN, never a client redirect.

import type { Coupon, CouponTrigger, Order } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveTriggeredCoupon } from "./coupons";
import { addDays, formatInvoiceNo, nextSubscriptionStart, priceOrder } from "./pricing";

export interface CreateOrderOptions {
  /** A pre-validated coupon to apply. Takes precedence over autoTrigger. */
  coupon?: Coupon | null;
  /** If no explicit coupon, auto-resolve the promo for this lifecycle moment. */
  autoTrigger?: CouponTrigger;
}

/**
 * Build a unique invoice number MM-YYYYMMDD-####. The sequence is the count of
 * the day's orders + 1; on the rare collision (concurrent creates) we probe the
 * next few, then fall back to a timestamp suffix that can't collide.
 */
async function generateInvoiceNo(now: Date): Promise<string> {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const todays = await prisma.order.count({
    where: { createdAt: { gte: start, lt: end } },
  });

  for (let i = 0; i < 5; i++) {
    const candidate = formatInvoiceNo(now, todays + 1 + i);
    const exists = await prisma.order.findUnique({ where: { invoiceNo: candidate } });
    if (!exists) return candidate;
  }
  return `MM-${formatInvoiceNo(now, 0).slice(3, 11)}-${Date.now()}`;
}

/**
 * Create a PENDING order for `userId` on `planCode`, snapshotting the plan's
 * name/duration/price and the applied discount so later catalog changes never
 * rewrite this order's history. Does NOT grant access — call activateOrder.
 */
export async function createOrder(
  userId: string,
  planCode: string,
  options: CreateOrderOptions = {},
  now: Date = new Date(),
): Promise<Order> {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) {
    throw new Error(`Plan not available: ${planCode}`);
  }

  let coupon = options.coupon ?? null;
  if (!coupon && options.autoTrigger) {
    coupon = await resolveTriggeredCoupon(userId, options.autoTrigger, plan.code, now);
  }

  const priced = priceOrder(plan.priceAmount, coupon);
  const invoiceNo = await generateInvoiceNo(now);

  return prisma.order.create({
    data: {
      invoiceNo,
      userId,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      durationDays: plan.durationDays,
      baseAmount: priced.baseAmount,
      discountAmount: priced.discountAmount,
      finalAmount: priced.finalAmount,
      currency: plan.currency,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      status: "PENDING",
    },
  });
}

export interface ActivateResult {
  activated: boolean;
  /** True when the order was already PAID — a safe idempotent no-op. */
  alreadyActive: boolean;
  subscriptionId?: string;
}

export interface ActivateOptions {
  gateway?: string;
  gatewayTxnId?: string;
}

/**
 * Idempotently activate a PAID order: flip status, create the Subscription
 * (stacking from any current end date), grant Pro + proExpiresAt, record the
 * coupon redemption, and log the successful Payment.
 *
 * Concurrency-safe: the status flip is an atomic compare-and-set
 * (updateMany WHERE status=PENDING), so a replayed IPN can never double-extend.
 */
export async function activateOrder(
  orderId: string,
  options: ActivateOptions = {},
  now: Date = new Date(),
): Promise<ActivateResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order not found: ${orderId}`);
  if (order.status === "PAID") return { activated: false, alreadyActive: true };
  if (order.status !== "PENDING") {
    throw new Error(`Order ${order.invoiceNo} is ${order.status}, cannot activate`);
  }

  return prisma.$transaction(async (tx) => {
    // Atomic claim: only one caller wins the PENDING -> PAID transition.
    const claim = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: now, gateway: options.gateway ?? order.gateway },
    });
    if (claim.count === 0) return { activated: false, alreadyActive: true };

    const user = await tx.user.findUnique({
      where: { id: order.userId },
      select: { proExpiresAt: true },
    });
    const startsAt = nextSubscriptionStart(user?.proExpiresAt ?? null, now);
    const endsAt = addDays(startsAt, order.durationDays);

    const subscription = await tx.subscription.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        planCode: order.planCode,
        startsAt,
        endsAt,
        status: "ACTIVE",
      },
    });

    await tx.user.update({
      where: { id: order.userId },
      data: { isPro: true, proExpiresAt: endsAt },
    });

    if (order.couponId) {
      await tx.couponRedemption.create({
        data: { couponId: order.couponId, userId: order.userId, orderId: order.id },
      });
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { redeemedCount: { increment: 1 } },
      });
    }

    // No money moves on a 100%-off (signup grant) order, so no Payment row.
    if (order.finalAmount > 0) {
      await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: options.gateway ?? "mock",
          gatewayTxnId: options.gatewayTxnId,
          status: "SUCCESS",
          amount: order.finalAmount,
        },
      });
    }

    return { activated: true, alreadyActive: false, subscriptionId: subscription.id };
  });
}

/**
 * Signup hook: auto-apply the SIGNUP promo (100% off) and, because the order
 * totals zero, activate it immediately — granting instant Pro with no gateway.
 * Returns the order, or null if no signup promo is currently available.
 */
export async function grantSignupSubscription(
  userId: string,
  now: Date = new Date(),
): Promise<Order | null> {
  const candidates = await prisma.coupon.findMany({
    where: { trigger: "SIGNUP", isActive: true, grantsPlanCode: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  for (const coupon of candidates) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (coupon.perUserLimit != null && used >= coupon.perUserLimit) continue;
    if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
      continue;
    }

    const order = await createOrder(
      userId,
      coupon.grantsPlanCode as string,
      { coupon },
      now,
    );
    // Signup grant is 100% off -> zero gateway. If a promo ever leaves a
    // balance, leave it PENDING for the normal checkout flow instead.
    if (order.finalAmount === 0) {
      await activateOrder(order.id, { gateway: "signup-grant" }, now);
      // Re-read so the caller sees the activated (PAID) state, not the stale one.
      return (await prisma.order.findUnique({ where: { id: order.id } })) ?? order;
    }
    return order;
  }

  return null;
}
