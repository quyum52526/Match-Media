"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { getOrCreateConversation } from "@/lib/data/messaging";
import { notify } from "@/lib/notifications/dispatch";

const MESSAGES = "/[locale]/messages";
const THREAD = "/[locale]/messages/[conversationId]";

/** Plain ICE-server shape (RTCIceServer is a DOM type unavailable on the server). */
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export type StartCallResult =
  | { ok: true; callId: string; conversationId: string; otherUserId: string }
  | { ok: false; error: "UNAUTH" | "NOT_VERIFIED" | "NOT_MATCHED" };

export type CallActionResult = { ok: boolean };

/**
 * ICE servers for the peer connection. Google STUN is always included; a TURN
 * relay is appended only when TURN_URL is configured. Returned from the server
 * at call time so TURN credentials never sit statically in the client bundle.
 */
export async function getIceServers(): Promise<IceServer[]> {
  const servers: IceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrl = process.env.TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  return servers;
}

/** Resolve a call's conversation participants + caller, or null if not found. */
async function loadCall(callId: string) {
  return prisma.callSession.findUnique({
    where: { id: callId },
    include: {
      conversation: { select: { id: true, userAId: true, userBId: true } },
    },
  });
}

/**
 * Start a voice call to another user. Re-checks the gate (mobile-verified +
 * matched) on the server — the security boundary, independent of UI. Creates a
 * RINGING CallSession whose id is the Realtime signaling channel name.
 */
export async function startCall(otherUserId: string): Promise<StartCallResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false, error: "UNAUTH" };

  const caller = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isMobileVerified: true },
  });
  if (!caller?.isMobileVerified) return { ok: false, error: "NOT_VERIFIED" };

  // Authoritative gate: must be a mutual match (also creates the conversation).
  const conversationId = await getOrCreateConversation(viewerId, otherUserId);
  if (!conversationId) return { ok: false, error: "NOT_MATCHED" };

  const call = await prisma.callSession.create({
    data: { conversationId, callerId: viewerId, status: "RINGING" },
    select: { id: true },
  });

  return { ok: true, callId: call.id, conversationId, otherUserId };
}

/** Callee accepts a ringing call → ACTIVE. Only the non-caller participant may. */
export async function acceptCall(callId: string): Promise<CallActionResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false };

  const call = await loadCall(callId);
  if (!call || call.status !== "RINGING") return { ok: false };
  const { userAId, userBId } = call.conversation;
  const isParticipant = viewerId === userAId || viewerId === userBId;
  // The callee is the participant who is NOT the caller.
  if (!isParticipant || viewerId === call.callerId) return { ok: false };

  await prisma.callSession.update({
    where: { id: callId },
    data: { status: "ACTIVE", startedAt: new Date() },
  });
  return { ok: true };
}

/** Callee rejects a ringing call → DECLINED, logged in the thread. */
export async function declineCall(callId: string): Promise<CallActionResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false };

  const call = await loadCall(callId);
  if (!call || call.status !== "RINGING") return { ok: false };
  const { userAId, userBId } = call.conversation;
  const isParticipant = viewerId === userAId || viewerId === userBId;
  if (!isParticipant || viewerId === call.callerId) return { ok: false };

  await prisma.$transaction([
    prisma.callSession.update({
      where: { id: callId },
      data: { status: "DECLINED", endedAt: new Date() },
    }),
    ...callEventWrites(call.conversationId, call.callerId, "DECLINED"),
  ]);

  revalidatePath(MESSAGES, "page");
  revalidatePath(THREAD, "page");
  return { ok: true };
}

/**
 * End a call. The final status is derived from the CURRENT server state, never
 * trusting the client:
 *  - ACTIVE  → ENDED (with duration), logged as a call event.
 *  - RINGING + caller ends → MISSED: logs a "missed" event AND fires a
 *    MISSED_CALL notification to the callee.
 *  - RINGING + callee ends → DECLINED.
 * Idempotent: ending an already-terminal call is a no-op.
 */
export async function endCall(callId: string): Promise<CallActionResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false };

  const call = await loadCall(callId);
  if (!call) return { ok: false };
  const { userAId, userBId } = call.conversation;
  const isParticipant = viewerId === userAId || viewerId === userBId;
  if (!isParticipant) return { ok: false };

  // Already finished — nothing to do.
  if (call.status !== "RINGING" && call.status !== "ACTIVE") return { ok: true };

  const now = new Date();
  const callee = call.callerId === userAId ? userBId : userAId;

  if (call.status === "ACTIVE") {
    const secs = call.startedAt
      ? Math.max(0, Math.round((now.getTime() - call.startedAt.getTime()) / 1000))
      : 0;
    await prisma.$transaction([
      prisma.callSession.update({
        where: { id: callId },
        data: { status: "ENDED", endedAt: now },
      }),
      ...callEventWrites(call.conversationId, call.callerId, `ENDED:${secs}`),
    ]);
  } else if (viewerId === call.callerId) {
    // Caller hung up before the callee answered → a missed call for the callee.
    await prisma.$transaction([
      prisma.callSession.update({
        where: { id: callId },
        data: { status: "MISSED", endedAt: now },
      }),
      ...callEventWrites(call.conversationId, call.callerId, "MISSED"),
    ]);
    await notify({
      userId: callee,
      type: "MISSED_CALL",
      actorId: call.callerId,
      link: `/messages/${call.conversationId}`,
    });
  } else {
    // Callee dismissed the ringing call → treat as declined.
    await prisma.$transaction([
      prisma.callSession.update({
        where: { id: callId },
        data: { status: "DECLINED", endedAt: now },
      }),
      ...callEventWrites(call.conversationId, call.callerId, "DECLINED"),
    ]);
  }

  revalidatePath(MESSAGES, "page");
  revalidatePath(THREAD, "page");
  return { ok: true };
}

/**
 * Build the transaction ops that log a call outcome as a CALL_EVENT message and
 * bump the conversation's activity time. `senderId` is the caller (the event's
 * natural actor). The compact `body` code (e.g. "ENDED:133" | "MISSED" |
 * "DECLINED") is rendered localized in the thread.
 */
function callEventWrites(
  conversationId: string,
  callerId: string,
  body: string,
) {
  return [
    prisma.message.create({
      data: { conversationId, senderId: callerId, body, type: "CALL_EVENT" },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ];
}
