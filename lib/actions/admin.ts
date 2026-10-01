"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertSuperAdmin } from "@/lib/session";
import { notify } from "@/lib/notifications/dispatch";
import { FEATURE_FLAGS, isFeatureFlagKey } from "@/lib/constants/featureFlags";

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

  // Agency-managed profiles (userId=null) have no account owner to notify.
  if (image.profile.userId) {
    await notify({
      userId: image.profile.userId,
      type: "PHOTO_APPROVED",
      actorId: adminId,
      link: "/profile/edit",
    });
  }

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

  if (image.profile.userId) {
    await notify({
      userId: image.profile.userId,
      type: "PHOTO_REJECTED",
      actorId: adminId,
      link: "/profile/edit",
    });
  }

  revalidatePath(ADMIN, "page");
  revalidatePath(ADMIN_PHOTOS, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  revalidatePath(PROFILE_EDIT, "page");
  return ok;
}

/** Grant or revoke a profile's Verified trust badge. Keyed by Profile id so
 *  agency-managed profiles (userId = null) can be verified too. */
export async function setVerified(
  profileId: string,
  value: boolean,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const updated = await prisma.profile.update({
    where: { id: profileId },
    data: { isVerified: value },
    select: { userId: true },
  });

  // Tell the user when their badge is granted (not on revoke). Agency-managed
  // profiles have no login account, so there's nobody to notify.
  if (value && updated.userId) {
    await notify({
      userId: updated.userId,
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

// ---------------------------------------------------------------------------
// Document / identity verification approvals
// ---------------------------------------------------------------------------

/**
 * Auto-grant the isVerified badge when BOTH NID and selfie are APPROVED.
 * Called internally after every individual approval — idempotent.
 */
async function maybeAutoGrantBadge(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nidVerificationStatus: true, selfieVerificationStatus: true },
  });
  if (
    user?.nidVerificationStatus === "APPROVED" &&
    user?.selfieVerificationStatus === "APPROVED"
  ) {
    const updated = await prisma.profile.updateMany({
      where: { userId, isVerified: false },
      data: { isVerified: true },
    });
    if (updated.count > 0) {
      await notify({ userId, type: "VERIFIED_BADGE", actorId: adminId, link: "/profile/verify" });
    }
  }
}

export async function approveNid(userId: string): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { nidVerificationStatus: "APPROVED", nidReviewNote: null },
  });
  await notify({ userId, type: "NID_APPROVED", actorId: adminId, link: "/profile/verify" });
  await maybeAutoGrantBadge(userId, adminId);

  revalidatePath(ADMIN_VERIFY, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  return ok;
}

export async function rejectNid(
  userId: string,
  note?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { nidVerificationStatus: "REJECTED", nidReviewNote: note?.trim() || null },
  });
  await notify({ userId, type: "NID_REJECTED", actorId: adminId, link: "/profile/verify" });

  revalidatePath(ADMIN_VERIFY, "page");
  return ok;
}

export async function approveSelfie(userId: string): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { selfieVerificationStatus: "APPROVED", selfieReviewNote: null },
  });
  await notify({ userId, type: "SELFIE_APPROVED", actorId: adminId, link: "/profile/verify" });
  await maybeAutoGrantBadge(userId, adminId);

  revalidatePath(ADMIN_VERIFY, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  return ok;
}

export async function rejectSelfie(
  userId: string,
  note?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { selfieVerificationStatus: "REJECTED", selfieReviewNote: note?.trim() || null },
  });
  await notify({ userId, type: "SELFIE_REJECTED", actorId: adminId, link: "/profile/verify" });

  revalidatePath(ADMIN_VERIFY, "page");
  return ok;
}

export async function approveAgency(userId: string): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { agencyVerificationStatus: "VERIFIED" },
  });

  revalidatePath(ADMIN_VERIFY, "page");
  return ok;
}

export async function rejectAgency(userId: string): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { agencyVerificationStatus: "REJECTED" },
  });

  revalidatePath(ADMIN_VERIFY, "page");
  return ok;
}

/**
 * Reset any user's password. SUPER_ADMIN only.
 *
 * Deliberately NOT available to a plain ADMIN (moderator): setting someone
 * else's password is account takeover, not moderation, so it sits with the
 * owner alongside the other sensitive operations.
 *
 * The plaintext `newPassword` arrives over HTTPS, is hashed server-side with
 * bcrypt (salt 10, matching auth.ts), and stored — the hash never leaves the
 * server. The existing passwordHash is never read or returned to the client.
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<AdminResult> {
  const adminId = await assertSuperAdmin();
  if (!adminId) return err("FORBIDDEN");

  if (!newPassword || newPassword.length < 8) return err("TOO_SHORT");

  // Confirm the target user exists before writing.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return err("NOT_FOUND");

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });

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

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

/**
 * Toggle a runtime feature flag. SUPER_ADMIN only.
 *
 * Deliberately NOT available to a plain ADMIN (moderator): a flag changes
 * platform-wide behaviour (whether SMS is paid for, whether browsing is gated),
 * which is an owner decision rather than a moderation one. The settings page
 * renders read-only for a moderator; this is the boundary behind it.
 *
 * The key is validated against the code-defined catalog rather than written
 * through: an arbitrary key would create a row nothing reads, which looks like a
 * working toggle in the UI and silently does nothing.
 *
 * `upsert`, not `update`, because a key may not have a row yet (added in code
 * ahead of the seed) — the first toggle creates it.
 */
export async function updateFeatureFlag(
  key: string,
  enabled: boolean,
): Promise<AdminResult> {
  const adminId = await assertSuperAdmin();
  if (!adminId) return err("FORBIDDEN");
  if (!isFeatureFlagKey(key)) return err("UNKNOWN_FLAG");

  await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled },
    create: { key, enabled, description: FEATURE_FLAGS[key].description },
  });

  // Flags change server behaviour app-wide (upload steps appear/disappear, the
  // browse gate opens or closes), so drop the whole layout cache rather than
  // guessing which pages read which flag.
  revalidatePath("/", "layout");
  return ok;
}
