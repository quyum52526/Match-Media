// Free-tier daily caps. Pro users are unlimited; free users get FREE_DAILY_LIMIT
// of each action per (UTC) day, tracked in DailyUsage via upsert+increment.

import type { UsageAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_DAILY_LIMIT } from "@/lib/constants/plans";
import { isProActive } from "./pricing";

type ProUser = { id: string; isPro?: boolean | null; proExpiresAt?: Date | null };

/** Start-of-day in UTC — matches ProfileViewLog's @db.Date convention. */
function startOfDayUTC(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export class DailyLimitError extends Error {
  constructor(
    public readonly action: UsageAction,
    public readonly limit: number,
  ) {
    super(`Daily limit reached for ${action} (${limit}/day)`);
    this.name = "DailyLimitError";
  }
}

export async function getDailyUsageCount(
  userId: string,
  action: UsageAction,
  now: Date = new Date(),
): Promise<number> {
  const row = await prisma.dailyUsage.findUnique({
    where: { userId_date_action: { userId, date: startOfDayUTC(now), action } },
  });
  return row?.count ?? 0;
}

export interface LimitCheck {
  allowed: boolean;
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
}

/** Pro-aware: returns an unlimited pass for active Pro, else the day's tally. */
export async function checkDailyLimit(
  user: ProUser,
  action: UsageAction,
  now: Date = new Date(),
): Promise<LimitCheck> {
  if (isProActive(user, now)) {
    return {
      allowed: true,
      unlimited: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
    };
  }
  const used = await getDailyUsageCount(user.id, action, now);
  return {
    allowed: used < FREE_DAILY_LIMIT,
    unlimited: false,
    limit: FREE_DAILY_LIMIT,
    used,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
  };
}

/** Increment today's counter for a free user's action (no-op semantics for Pro
 * are the caller's choice — Pro paths typically skip calling this). */
export async function incrementDailyUsage(
  userId: string,
  action: UsageAction,
  now: Date = new Date(),
): Promise<void> {
  const date = startOfDayUTC(now);
  await prisma.dailyUsage.upsert({
    where: { userId_date_action: { userId, date, action } },
    update: { count: { increment: 1 } },
    create: { userId, date, action, count: 1 },
  });
}

/** Guard for server actions: throws DailyLimitError when a free user is capped. */
export async function assertWithinDailyLimit(
  user: ProUser,
  action: UsageAction,
  now: Date = new Date(),
): Promise<LimitCheck> {
  const check = await checkDailyLimit(user, action, now);
  if (!check.allowed) throw new DailyLimitError(action, check.limit);
  return check;
}
