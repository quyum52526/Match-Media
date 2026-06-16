"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";

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

/** Viewer requests access to an owner's blurred photo. */
export async function requestPhotoAccess(ownerId: string): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId || !ownerId || ownerId === viewerId) return;

  await prisma.photoAccessRequest.upsert({
    where: { viewerId_ownerId: { viewerId, ownerId } },
    update: { status: "PENDING", requestedAt: new Date(), respondedAt: null },
    create: { viewerId, ownerId, status: "PENDING" },
  });

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

// --- Membership --------------------------------------------------------------

/** Upgrade the current viewer to Pro (one half of the contact-reveal gate). */
export async function upgradeToPro(): Promise<void> {
  const viewerId = await getViewerId();
  if (!viewerId) return;

  await prisma.user.update({
    where: { id: viewerId },
    data: { isPro: true },
  });

  revalidatePath(PROFILE, "page");
  revalidatePath(BROWSE, "page");
}
