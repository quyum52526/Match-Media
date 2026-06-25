import "server-only";
import { prisma } from "@/lib/prisma";
import { personProfileSelect, toRequestPerson } from "./person";
import { areUsersMatched } from "./messaging";
import type {
  ConversationSummary,
  ConversationView,
} from "@/components/messages/types";

const counterpartSelect = {
  select: { id: true, profile: { select: personProfileSelect } },
} as const;

/** The viewer's conversations, most-recent first, with previews + unread counts. */
export async function getConversations(
  viewerId: string,
): Promise<ConversationSummary[]> {
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: counterpartSelect,
      userB: counterpartSelect,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          // Only TEXT messages count as "unread" — call events are surfaced via
          // notifications, not the messages badge.
          messages: {
            where: { readAt: null, senderId: { not: viewerId }, type: "TEXT" },
          },
        },
      },
    },
  });

  return convos.flatMap((c) => {
    const other = c.userAId === viewerId ? c.userB : c.userA;
    const person = toRequestPerson(other);
    if (!person) return [];
    const last = c.messages[0];
    return [
      {
        id: c.id,
        person,
        lastPreview: last?.body ?? "",
        lastType: (last?.type ?? "TEXT") as ConversationSummary["lastType"],
        lastMessageAt: c.lastMessageAt.toISOString(),
        unread: c._count.messages,
        lastFromMe: last ? last.senderId === viewerId : false,
      } satisfies ConversationSummary,
    ];
  });
}

/**
 * Full thread for a conversation the viewer is part of. Returns null if the
 * conversation doesn't exist or the viewer isn't a participant (the security
 * boundary for the thread page). `canSend` reflects the *current* match state.
 */
export async function getConversation(
  viewerId: string,
  conversationId: string,
): Promise<ConversationView | null> {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userA: counterpartSelect,
      userB: counterpartSelect,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!convo) return null;
  if (convo.userAId !== viewerId && convo.userBId !== viewerId) return null;

  const other = convo.userAId === viewerId ? convo.userB : convo.userA;
  const person = toRequestPerson(other);
  if (!person) return null;

  return {
    id: convo.id,
    person,
    otherUserId: other.id,
    messages: convo.messages.map((m) => ({
      id: m.id,
      body: m.body,
      type: m.type as "TEXT" | "SYSTEM" | "CALL_EVENT",
      mine: m.senderId === viewerId,
      createdAt: m.createdAt.toISOString(),
    })),
    canSend: await areUsersMatched(viewerId, other.id),
  };
}

/** Total unread incoming messages across all of the viewer's conversations. */
export async function getUnreadCount(viewerId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: viewerId },
      type: "TEXT", // call events are not "unread messages"
      conversation: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    },
  });
}
