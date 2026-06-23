"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/session";
import { notify } from "@/lib/notifications/dispatch";

// Dynamic-route literals so revalidation covers every locale param.
const ADMIN = "/[locale]/admin";
const ADMIN_PHOTOS = "/[locale]/admin/photos";
const ADMIN_REPORTS = "/[locale]/admin/reports";
const ADMIN_VERIFY = "/[locale]/admin/verification";
const BROWSE = "/[locale]/browse";
const PROFILE = "/[locale]/profiles/[id]";
const PROFILE_EDIT = "/[locale]/profile/edit";

/** Status codes the admin UI localizes; `ok` is the success case. */
export type AdminResult = { ok: true } | { ok: false; error: string };
const ok: AdminResult = { ok: true };
const err = (error: string): AdminResult => ({ ok: false, error });

/** Approve a pending photo — it becomes visible per the normal privacy gate. */
export async function approvePhoto(imageId: string): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const image = await prisma.profileImage.update({
    where: { id: imageId },
    data: {
      moderationStatus: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: adminId,
      rejectionReason: null,
    },
    select: { profile: { select: { userId: true } } },
  });

  await notify({
    userId: image.profile.userId,
    type: "PHOTO_APPROVED",
    actorId: adminId,
    link: "/profile/edit",
  });

  revalidatePath(ADMIN, "page");
  revalidatePath(ADMIN_PHOTOS, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  revalidatePath(PROFILE_EDIT, "page");
  return ok;
}

/** Reject a pending photo. Row + storage are kept (audit / possible appeal). */
export async function rejectPhoto(
  imageId: string,
  reason?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const image = await prisma.profileImage.update({
    where: { id: imageId },
    data: {
      moderationStatus: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: adminId,
      rejectionReason: reason?.trim() || null,
    },
    select: { profile: { select: { userId: true } } },
  });

  await notify({
    userId: image.profile.userId,
    type: "PHOTO_REJECTED",
    actorId: adminId,
    link: "/profile/edit",
  });

  revalidatePath(ADMIN, "page");
  revalidatePath(ADMIN_PHOTOS, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  revalidatePath(PROFILE_EDIT, "page");
  return ok;
}

/** Grant or revoke a profile's Verified trust badge. */
export async function setVerified(
  userId: string,
  value: boolean,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.profile.update({
    where: { userId },
    data: { isVerified: value },
  });

  // Tell the user when their badge is granted (not on revoke).
  if (value) {
    await notify({
      userId,
      type: "VERIFIED_BADGE",
      actorId: adminId,
      link: "/profile/edit",
    });
  }

  revalidatePath(ADMIN, "page");
  revalidatePath(ADMIN_VERIFY, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  return ok;
}

/** Close a report as RESOLVED (action taken) or DISMISSED (no action). */
export async function resolveReport(
  reportId: string,
  decision: "RESOLVED" | "DISMISSED",
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status: decision, resolvedById: adminId, resolvedAt: new Date() },
    select: { reporterId: true },
  });

  // Let the reporter know their report was actioned (no link — informational).
  await notify({
    userId: report.reporterId,
    type: "REPORT_RESOLVED",
    actorId: adminId,
  });

  revalidatePath(ADMIN, "page");
  revalidatePath(ADMIN_REPORTS, "page");
  return ok;
}
