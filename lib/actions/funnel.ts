"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { checkDailyLimit, incrementDailyUsage } from "@/lib/billing";

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
export async function requestPhotoAccess(ownerId: string): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId || !ownerId || ownerId === viewerId) return;

  const existing = await prisma.photoAccessRequest.findUnique({
    where: { viewerId_ownerId: { viewerId, ownerId } },
  });

  // Enforce the free-tier daily cap only for brand-new requests.
  if (!existing) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { isPro: true, proExpiresAt: true },
    });
    const check = await checkDailyLimit(
      { id: viewerId, isPro: viewer?.isPro, proExpiresAt: viewer?.proExpiresAt },
      "PHOTO_REQUEST",
    );
    if (!check.allowed) return; // daily limit reached — silently no-op
  }

  await prisma.photoAccessRequest.upsert({
    where: { viewerId_ownerId: { viewerId, ownerId } },
    update: { status: "PENDING", requestedAt: new Date(), respondedAt: null },
    create: { viewerId, ownerId, status: "PENDING" },
  });

  if (!existing) await incrementDailyUsage(viewerId, "PHOTO_REQUEST");

  revalidatePath(BROWSE, "page");
  revalidatePath(REQUESTS, "page");
  revalidatePath(PROFILE, "page");
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
    select: { ownerId: true },
  });
  // Only the owner of the request may respond.
  if (!request || request.ownerId !== viewerId) return;

  await prisma.photoAccessRequest.update({
    where: { id: requestId },
    data: { status: decision, respondedAt: new Date() },
  });

  revalidatePath(REQUESTS, "page");
  revalidatePath(BROWSE, "page");
}

// --- Interest ----------------------------------------------------------------

/** Viewer expresses interest in a profile. */
export async function sendInterest(receiverId: string): Promise<void> {
  const senderId = await getViewerId();
  if (!senderId || !receiverId || receiverId === senderId) return;

  await prisma.interest.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    update: { status: "SENT" },
    create: { senderId, receiverId, status: "SENT" },
  });

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
    select: { receiverId: true },
  });
  // Only the receiver of the interest may respond (consent stays with them).
  if (!interest || interest.receiverId !== viewerId) return;

  await prisma.interest.update({
    where: { id: interestId },
    data: { status: decision },
  });

  revalidatePath(INTERESTS, "page");
  revalidatePath(PROFILE, "page");
}

// Membership upgrades now go through the billing flow (/pro -> checkout ->
// gateway -> IPN -> activateOrder). The old instant-flip stub was removed; see
// lib/actions/billing.ts.
