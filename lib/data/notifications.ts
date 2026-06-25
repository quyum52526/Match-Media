import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface NotificationView {
  id: string;
  type: NotificationType;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const DEFAULT_TAKE = 30;

/** The viewer's notifications, most recent first. */
export async function getNotifications(
  viewerId: string,
  take: number = DEFAULT_TAKE,
): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    link: n.link,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
}

/** Count of the viewer's unread notifications (drives the header bell badge). */
export async function getUnreadNotificationCount(
  viewerId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { userId: viewerId, readAt: null },
  });
}
