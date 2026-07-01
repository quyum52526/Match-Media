"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { checkDailyLimit, incrementDailyUsage } from "@/lib/billing";
import { FREE_DAILY_LIMIT } from "@/lib/constants/plans";
import { notify } from "@/lib/notifications/dispatch";

/** Outcome of a photo-access request, so the UI can show quota feedback. */
export interface PhotoRequestResult {
  /** A request now exists (newly created or already present). */
  ok: boolean;
  /** Blocked because the free-tier daily cap was already reached. */
  limitReached: boolean;
  /** Viewer has unlimited (Pro) requests. */
  unlimited: boolean;
  /** New requests left today after this call (free tier). */
  remaining: number;
  limit: number;
}

// Dynamic-route literals so revalidation covers every locale param.
const BROWSE = "/[locale]/browse";
const REQUESTS = "/[locale]/requests";
const INTERESTS = "/[locale]/interests";
const PROFILE = "/[locale]/profiles/[id]";

/**
 * Funnel mutations (Server Actions). The acting user is the current viewer
 * (TODO(auth): derive from session instead of the hardcoded CURRENT_VIEWER_ID).
 * Each action revalidates the affected routes so the UI reflects the DB
 * immediately after it completes.
 */

// --- Photo access -----------------------------------------------------------

/**
 * Viewer requests access to an owner's blurred photo. Free users are capped at
 * FREE_DAILY_LIMIT *new* requests per day; re-sending to someone already
 * requested doesn't count against the cap (it just resets that request).
 */
export async function requestPhotoAccess(
  ownerId: string,
): Promise<PhotoRequestResult> {
  const blocked: PhotoRequestResult = {
    ok: false,
    limitReached: false,
    unlimited: false,
    remaining: 0,
    limit: FREE_DAILY_LIMIT,
  };

  const viewerId = await getViewerId();
  if (!viewerId || !ownerId || ownerId === viewerId) return blocked;

  const existing = await prisma.photoAccessRequest.findUnique({
    where: { viewerId_ownerId: { viewerId, ownerId } },
  });

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true, proExpiresAt: true },
  });
  const check = await checkDailyLimit(
    { id: viewerId, isPro: viewer?.isPro, proExpiresAt: viewer?.proExpiresAt },
    "PHOTO_REQUEST",
  );

  // The free-tier daily cap applies only to brand-new requests; re-sending to
  // someone already requested just resets that request and never counts.
  if (!existing && !check.allowed) {
    return { ...blocked, limitReached: true, unlimited: check.unlimited };
  }

  await prisma.photoAccessRequest.upsert({
    where: { viewerId_ownerId: { viewerId, ownerId } },
    update: { status: "PENDING", requestedAt: new Date(), respondedAt: null },
    create: { viewerId, ownerId, status: "PENDING" },
  });

  let remaining = check.unlimited ? FREE_DAILY_LIMIT : check.remaining;
  if (!existing) {
    await incrementDailyUsage(viewerId, "PHOTO_REQUEST");
    if (!check.unlimited) remaining = Math.max(0, check.remaining - 1);
    // Notify the owner only on a brand-new request (re-sends stay quiet).
    await notify({
      userId: ownerId,
      type: "PHOTO_REQUEST",
      actorId: viewerId,
      link: "/requests",
    });
  }

  revalidatePath(BROWSE, "page");
  revalidatePath(REQUESTS, "page");
  revalidatePath(PROFILE, "page");

  return {
    ok: true,
    limitReached: false,
    unlimited: check.unlimited,
    remaining,
    limit: FREE_DAILY_LIMIT,
  };
}

/** Owner approves or denies a photo-access request they received. */
export async function respondToPhotoRequest(
  requestId: string,
  decision: "APPROVED" | "DENIED",
): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId) return;

  const request = await prisma.photoAccessRequest.findUnique({
    where: { id: requestId },
    select: { ownerId: true, viewerId: true },
  });
  // Only the owner of the request may respond.
  if (!request || request.ownerId !== viewerId) return;

  await prisma.photoAccessRequest.update({
    where: { id: requestId },
    data: { status: decision, respondedAt: new Date() },
  });

  // Tell the requester their access was granted (the owner is `viewerId`, so the
  // requester opens the owner's profile to see the now-revealed photo).
  if (decision === "APPROVED") {
    await notify({
      userId: request.viewerId,
      type: "PHOTO_ACCESS_GRANTED",
      actorId: viewerId,
      link: `/profiles/${viewerId}`,
    });
  }

  revalidatePath(REQUESTS, "page");
  revalidatePath(BROWSE, "page");
}

// --- Interest ----------------------------------------------------------------

/** Viewer expresses interest in a profile, with an optional introductory note (max 200 chars). */
export async function sendInterest(
  receiverId: string,
  note?: string,
): Promise<void> {
  const senderId = await getViewerId();
  if (!senderId || !receiverId || receiverId === senderId) return;

  const trimmedNote = note?.trim().slice(0, 200) || null;

  const existing = await prisma.interest.findUnique({
    where: { senderId_receiverId: { senderId, receiverId } },
    select: { id: true },
  });

  await prisma.interest.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    update: { status: "SENT", note: trimmedNote },
    create: { senderId, receiverId, status: "SENT", note: trimmedNote },
  });

  // Notify the receiver only the first time interest is sent (not on re-sends).
  if (!existing) {
    await notify({
      userId: receiverId,
      type: "INTEREST_RECEIVED",
      actorId: senderId,
      link: "/interests",
    });
  }

  revalidatePath(PROFILE, "page");
}

/**
 * Viewer accepts or declines an interest they received.
 * NOTE: no "received interests" UI wires this yet — it exists so the funnel is
 * complete server-side and ready for that inbox.
 */
export async function respondToInterest(
  interestId: string,
  decision: "ACCEPTED" | "DECLINED",
): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId) return;

  const interest = await prisma.interest.findUnique({
    where: { id: interestId },
    select: { receiverId: true, senderId: true },
  });
  // Only the receiver of the interest may respond (consent stays with them).
  if (!interest || interest.receiverId !== viewerId) return;

  await prisma.interest.update({
    where: { id: interestId },
    data: { status: decision },
  });

  // An acceptance is a new match — tell the original sender (they can now message).
  if (decision === "ACCEPTED") {
    await notify({
      userId: interest.senderId,
      type: "INTEREST_ACCEPTED",
      actorId: viewerId,
      link: "/messages",
    });
  }

  revalidatePath(INTERESTS, "page");
  revalidatePath(PROFILE, "page");
}

// Membership upgrades now go through the billing flow (/pro -> checkout ->
// gateway -> IPN -> activateOrder). The old instant-flip stub was removed; see
// lib/actions/billing.ts.
