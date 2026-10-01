import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/provider";
import { notificationEmail } from "@/lib/email/notifications";

/**
 * Notification dispatcher. This is the SINGLE writer of Notification rows and
 * the one chokepoint where other channels fan out — call sites never change
 * when a channel is added. Email is now one of those channels: the types that
 * warrant one are listed in lib/email/notifications.ts and everything else
 * stays in-app only.
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

    // Fan out to email AFTER the row is committed, so the in-app notification
    // survives even a total mail outage.
    await sendNotificationEmail(userId, type, link);
  } catch (error) {
    console.error("notify failed", error);
  }
}

/**
 * Best-effort email for notification types that have copy.
 *
 * Its own try/catch rather than relying on notify()'s: an email is the least
 * important thing happening in this request, and it must not prevent anything
 * that might later be added after it. sendEmail() already returns false instead
 * of throwing, so this is belt-and-braces for the address lookup too.
 *
 * The template check comes FIRST so an in-app-only type (NEW_MESSAGE, which
 * fires constantly) costs no extra query.
 */
async function sendNotificationEmail(
  userId: string,
  type: NotificationType,
  link?: string,
): Promise<void> {
  try {
    const body = notificationEmail(type, link);
    if (!body) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return;

    const sent = await sendEmail({ to: user.email, ...body });
    if (!sent) {
      // Logged, not retried: the member still has the in-app notification, and
      // a moderation decision is not worth a queue and a retry budget.
      console.warn(`notification email not delivered (type=${type}, user=${userId})`);
    }
  } catch (error) {
    console.error("notification email failed", error);
  }
}
