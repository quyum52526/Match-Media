import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Messaging authorization + conversation plumbing. A "match" — a mutual ACCEPTED
 * interest in either direction — is the gate for messaging, the same predicate
 * used for dashboard `matches` and the contact-reveal gate.
 */

/** True when the two users have an ACCEPTED interest in either direction. */
export async function areUsersMatched(
  a: string,
  b: string,
): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const match = await prisma.interest.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(match);
}

/** Canonical participant ordering so each pair maps to exactly one row. */
export function orderedPair(
  a: string,
  b: string,
): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/**
 * Resolve (creating if needed) the conversation between the viewer and another
 * user — but ONLY when they're matched. Returns the conversation id, or null
 * when not matched (the caller treats that as "forbidden"). Idempotent thanks
 * to the @@unique([userAId, userBId]) constraint.
 */
export async function getOrCreateConversation(
  viewerId: string,
  otherId: string,
): Promise<string | null> {
  if (!(await areUsersMatched(viewerId, otherId))) return null;
  const pair = orderedPair(viewerId, otherId);
  const convo = await prisma.conversation.upsert({
    where: { userAId_userBId: pair },
    update: {},
    create: pair,
    select: { id: true },
  });
  return convo.id;
}
