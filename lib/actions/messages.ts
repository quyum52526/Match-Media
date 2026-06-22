"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { areUsersMatched, getOrCreateConversation } from "@/lib/data/messaging";

const MESSAGES = "/[locale]/messages";
const THREAD = "/[locale]/messages/[conversationId]";

const MAX_BODY = 2000;

export type SendResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

/**
 * Send a message to another user. Re-checks the match on every call — the
 * security boundary, independent of any UI gating. Creates the conversation on
 * first message (idempotent). Returns the conversation id so the caller can
 * route into the thread.
 */
export async function sendMessage(
  otherUserId: string,
  body: string,
): Promise<SendResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false, error: "UNAUTH" };

  const text = body.trim();
  if (!text) return { ok: false, error: "EMPTY" };
  if (text.length > MAX_BODY) return { ok: false, error: "TOO_LONG" };

  // Authoritative gate: must be a mutual match.
  const conversationId = await getOrCreateConversation(viewerId, otherUserId);
  if (!conversationId) return { ok: false, error: "NOT_MATCHED" };

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: viewerId, body: text },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  revalidatePath(MESSAGES, "page");
  revalidatePath(THREAD, "page");
  return { ok: true, conversationId };
}

/** Mark the viewer's unread incoming messages in a conversation as read. */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId) return;

  // Only a participant may mark read.
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!convo || (convo.userAId !== viewerId && convo.userBId !== viewerId)) {
    return;
  }

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: viewerId }, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath(MESSAGES, "page");
  revalidatePath(THREAD, "page");
}

/**
 * Resolve (creating if matched) the conversation with another user and return
 * its id — used by the "Message" button to route into the thread. Null when not
 * matched.
 */
export async function startConversation(
  otherUserId: string,
): Promise<string | null> {
  const viewerId = await getViewerId();
  if (!viewerId) return null;
  return getOrCreateConversation(viewerId, otherUserId);
}
