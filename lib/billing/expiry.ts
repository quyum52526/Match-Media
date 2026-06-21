// Bookkeeping sweep for lapsed Pro access. Correctness never depends on this —
// isProActive(user) is the source of truth and already treats an elapsed
// proExpiresAt as free — but the sweep keeps rows tidy so `isPro` stays a
// reliable fast-path flag and Subscription rows reflect reality. Idempotent and
// safe to run repeatedly (e.g. from a daily cron).

import { prisma } from "@/lib/prisma";

export interface ExpirySweepResult {
  /** ACTIVE subscriptions past their endsAt that were flipped to EXPIRED. */
  subscriptionsExpired: number;
  /** Users whose stale `isPro` flag was cleared. */
  usersDowngraded: number;
  ranAt: string;
}

export async function runExpirySweep(
  now: Date = new Date(),
): Promise<ExpirySweepResult> {
  // 1) ACTIVE subscriptions whose term has ended -> EXPIRED.
  const subscriptions = await prisma.subscription.updateMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  // 2) Clear `isPro` for users whose membership has lapsed. We DON'T touch
  //    proExpiresAt (it records when access ended). Two safety guards:
  //    - `proExpiresAt: { lte: now }` skips perpetual/lifetime grants (null is
  //      never <= now), so admin-granted lifetime Pro is preserved.
  //    - the `subscriptions: { none: ... }` guard refuses to downgrade anyone
  //      who still holds an ACTIVE subscription ending in the future (defends
  //      against any drift between proExpiresAt and a stacked renewal).
  const users = await prisma.user.updateMany({
    where: {
      isPro: true,
      proExpiresAt: { lte: now },
      subscriptions: { none: { status: "ACTIVE", endsAt: { gt: now } } },
    },
    data: { isPro: false },
  });

  return {
    subscriptionsExpired: subscriptions.count,
    usersDowngraded: users.count,
    ranAt: now.toISOString(),
  };
}
