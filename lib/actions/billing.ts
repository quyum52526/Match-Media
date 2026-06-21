"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";
import { createOrder, activateOrder } from "@/lib/billing/orders";
import { getGateway, DEFAULT_GATEWAY } from "@/lib/billing/gateway";
import { getOrderForViewer } from "@/lib/data/billing";

// 'bn' is the default, unprefixed locale; 'en' is path-prefixed.
function localePath(locale: string, path: string): string {
  return locale === "en" ? `/en${path}` : path;
}

/**
 * Start an upgrade: create a PENDING order for the chosen plan, auto-applying
 * the RENEWAL promo if the viewer is eligible. A fully-discounted order (0 due)
 * activates immediately; otherwise we send the user to checkout.
 */
export async function createUpgradeOrder(planCode: string, locale: string): Promise<void> {
  const viewerId = await requireViewerId(localePath(locale, "/login"));
  const order = await createOrder(viewerId, planCode, { autoTrigger: "RENEWAL" });

  if (order.finalAmount === 0) {
    await activateOrder(order.id, { gateway: "promo" });
    redirect(localePath(locale, `/pro/success?order=${order.id}`));
  }
  redirect(localePath(locale, `/pro/checkout/${order.id}`));
}

/** Begin payment for a PENDING order: open a gateway session and redirect. */
export async function initiatePayment(orderId: string, locale: string): Promise<void> {
  const viewerId = await requireViewerId(localePath(locale, "/login"));
  const order = await getOrderForViewer(orderId, viewerId);
  if (!order) redirect(localePath(locale, "/pro"));
  if (order.status === "PAID") redirect(localePath(locale, `/pro/success?order=${order.id}`));
  if (order.status !== "PENDING") redirect(localePath(locale, "/pro"));

  const gateway = getGateway(DEFAULT_GATEWAY);
  const session = await gateway.createSession({
    order,
    returnUrl: localePath(locale, `/pro/checkout/${order.id}`),
    appUrl: process.env.APP_URL,
    locale,
  });

  // An external gateway returns an absolute URL — redirect straight to it; an
  // in-app gateway (mock) returns an app-relative path that needs the locale.
  const dest = /^https?:\/\//.test(session.redirectUrl)
    ? session.redirectUrl
    : localePath(locale, session.redirectUrl);
  redirect(dest);
}

/**
 * Mock-gateway callback (stands in for a real server-to-server IPN). Verifies
 * the simulated outcome and, on success, idempotently activates the order.
 */
export async function completeMockPayment(
  orderId: string,
  outcome: "SUCCESS" | "FAIL",
  locale: string,
): Promise<void> {
  const viewerId = await requireViewerId(localePath(locale, "/login"));
  const order = await getOrderForViewer(orderId, viewerId);
  if (!order) redirect(localePath(locale, "/pro"));

  const gateway = getGateway("mock");
  const result = await gateway.verifyIpn({
    orderId,
    status: outcome === "SUCCESS" ? "SUCCESS" : "FAILED",
    txnId: `MOCK-${Date.now()}`,
  });

  if (result.success) {
    await activateOrder(result.orderId, { gateway: "mock", gatewayTxnId: result.gatewayTxnId });
    redirect(localePath(locale, `/pro/success?order=${order.id}`));
  }

  // Failure: mark the still-PENDING order FAILED and return to checkout.
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "FAILED" },
  });
  redirect(localePath(locale, `/pro/checkout/${order.id}?status=failed`));
}
