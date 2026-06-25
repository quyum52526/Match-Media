import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * In-app notification dispatcher. This is the SINGLE writer of Notification rows
 * and the one chokepoint where future channels (email / SMS push) will fan out —
 * call sites never change when those are added.
 *
 * Defensive by design: a notification is a side effect of a user action, so a
 * failure here must NEVER bubble up and break that action (same pattern as
 * grantSignupSubscription in lib/actions/auth.ts). Errors are logged and
 * swallowed.
 */
export interface NotifyInput {
  /** Recipient user id. */
  userId: string;
  type: NotificationType;
  /** Who triggered it (audit only). Self-notifications are skipped. */
  actorId?: string;
  /** In-app route to open on click. */
  link?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    const { userId, type, actorId, link } = input;
    if (!userId) return;
    // Never notify someone about their own action.
    if (actorId && actorId === userId) return;

    // Collapse message-burst noise: if there's already an unread NEW_MESSAGE for
    // this recipient + conversation, don't stack another (the Messages badge
    // already conveys volume).
    if (type === "NEW_MESSAGE" && link) {
      const existing = await prisma.notification.findFirst({
        where: { userId, type: "NEW_MESSAGE", link, readAt: null },
        select: { id: true },
      });
      if (existing) return;
    }

    await prisma.notification.create({
      data: { userId, type, actorId: actorId ?? null, link: link ?? null },
    });
  } catch (error) {
    console.error("notify failed", error);
  }
}
