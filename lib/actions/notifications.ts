"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";

const NOTIFICATIONS = "/[locale]/notifications";

/**
 * Mark all of the viewer's unread notifications as read. Called when the
 * notifications page opens (pattern mirrors markConversationRead in
 * lib/actions/messages.ts). Revalidates so the header bell badge clears.
 */
export async function markNotificationsRead(): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId) return;

  await prisma.notification.updateMany({
    where: { userId: viewerId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath(NOTIFICATIONS, "page");
}
