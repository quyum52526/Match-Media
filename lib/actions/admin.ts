"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertSuperAdmin } from "@/lib/session";
import { notify } from "@/lib/notifications/dispatch";
import { sendModerationEmail } from "@/lib/email/notifications";
import { FEATURE_FLAGS, isFeatureFlagKey } from "@/lib/constants/featureFlags";
import { calcAge, computeCompletion, normalizeBdMobile } from "@/lib/utils";
import { GENDERS } from "@/lib/constants/profileOptions";
import { MAX_PHOTOS, storeProfileImage, validateUpload } from "@/lib/storage/images";

// Dynamic-route literals so revalidation covers every locale param.
const ADMIN = "/[locale]/admin";
const ADMIN_PHOTOS = "/[locale]/admin/photos";
const ADMIN_REPORTS = "/[locale]/admin/reports";
const ADMIN_VERIFY = "/[locale]/admin/verification";
const ADMIN_USERS = "/[locale]/admin/users";
const BROWSE = "/[locale]/browse";
const PROFILE = "/[locale]/profiles/[id]";
const PROFILE_EDIT = "/[locale]/profile/edit";

/**
 * Refresh the tab-nav badge counts.
 *
 * Those counts are computed in the admin LAYOUT, and
 * `revalidatePath(path, "page")` does not refresh layout data — so without
 * this a moderator approves a photo and the badge keeps showing the old
 * number until a full reload. Revalidating the layout segment refreshes the
 * counts for every admin page nested under it.
 */
function revalidateAdminNav() {
  revalidatePath(ADMIN, "layout");
}

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
  revalidateAdminNav();
  return ok;
}

/** Reject a pending photo. Row + storage are kept (audit / possible appeal). */
export async function rejectPhoto(
  imageId: string,
  reason?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const rejectionReason = reason?.trim() || null;
  const image = await prisma.profileImage.update({
    where: { id: imageId },
    data: {
      moderationStatus: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: adminId,
      rejectionReason,
    },
    select: { profile: { select: { userId: true } } },
  });

  if (image.profile.userId) {
    await notify({
      userId: image.profile.userId,
      type: "PHOTO_REJECTED",
      actorId: adminId,
      link: "/profile/edit",
      reason: rejectionReason,
    });
  }

  revalidatePath(ADMIN, "page");
  revalidatePath(ADMIN_PHOTOS, "page");
  revalidatePath(BROWSE, "page");
  revalidatePath(PROFILE, "page");
  revalidatePath(PROFILE_EDIT, "page");
  revalidateAdminNav();
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
  revalidateAdminNav();
  return ok;
}

/** Toggle a profile's appearance in the homepage recommendations. */
export async function toggleFeaturedProfile(
  profileId: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const current = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { isFeatured: true },
  });
  if (!current) return err("NOT_FOUND");

  await prisma.profile.update({
    where: { id: profileId },
    data: { isFeatured: !current.isFeatured },
  });

  revalidatePath(PROFILE, "page");
  revalidatePath("/", "layout");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/browse", "page");
  revalidateTag("showcase");
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
  revalidateAdminNav();
  return ok;
}

export async function rejectNid(
  userId: string,
  note?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const reviewNote = note?.trim() || null;
  await prisma.user.update({
    where: { id: userId },
    data: { nidVerificationStatus: "REJECTED", nidReviewNote: reviewNote },
  });
  await notify({
    userId,
    type: "NID_REJECTED",
    actorId: adminId,
    link: "/profile/verify",
    reason: reviewNote,
  });

  revalidatePath(ADMIN_VERIFY, "page");
  revalidateAdminNav();
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
  revalidateAdminNav();
  return ok;
}

export async function rejectSelfie(
  userId: string,
  note?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  const reviewNote = note?.trim() || null;
  await prisma.user.update({
    where: { id: userId },
    data: { selfieVerificationStatus: "REJECTED", selfieReviewNote: reviewNote },
  });
  await notify({
    userId,
    type: "SELFIE_REJECTED",
    actorId: adminId,
    link: "/profile/verify",
    reason: reviewNote,
  });

  revalidatePath(ADMIN_VERIFY, "page");
  revalidateAdminNav();
  return ok;
}

export async function approveAgency(userId: string): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { agencyVerificationStatus: "VERIFIED" },
  });
  // No NotificationType exists for agency outcomes, so email directly.
  // Best-effort: sendModerationEmail logs and swallows every failure.
  await sendModerationEmail(userId, "AGENCY_APPROVED");

  revalidatePath(ADMIN_VERIFY, "page");
  revalidateAdminNav();
  return ok;
}

export async function rejectAgency(
  userId: string,
  note?: string,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  await prisma.user.update({
    where: { id: userId },
    data: { agencyVerificationStatus: "REJECTED" },
  });
  // There is no column for an agency review note, so the reason travels in
  // the email only.
  await sendModerationEmail(userId, "AGENCY_REJECTED", {
    reason: note?.trim() || null,
  });

  revalidatePath(ADMIN_VERIFY, "page");
  revalidateAdminNav();
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
  revalidateAdminNav();
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

// ---------------------------------------------------------------------------
// Manual profile creation
// ---------------------------------------------------------------------------

/** What the admin form collects. Everything optional is genuinely optional. */
export interface AdminCreateProfileInput {
  fullName: string;
  gender: string;
  dateOfBirth: string; // "yyyy-mm-dd"
  mobile: string;
  email?: string;
  district?: string;
  profession?: string;
  accountCategory?: "SELF" | "PARENTS" | "MEDIA" | "AGENT";
  /**
   * Grant the "Verified" trust badge. OFF by default: that badge tells other
   * members an identity was CHECKED, so it stays an explicit assertion by the
   * admin creating the record rather than a side effect of the shortcut.
   */
  markVerified?: boolean;
  /**
   * Password to set. Blank means "generate one" — useful when the admin is on
   * the phone with the person and wants to read out something they chose.
   * Held only as a bcrypt hash either way.
   */
  password?: string;
}

export type AdminCreateProfileResult =
  | {
      ok: true;
      userId: string;
      email: string;
      /** The password to hand over; generated when the admin supplied none. */
      password: string;
      /** True when it was generated here, so the UI can say "shown once". */
      generated: boolean;
      /** Whether a matrimonial profile exists to attach photos to. */
      hasProfile: boolean;
    }
  | { ok: false; error: string };

/** Category -> Role, mirroring registration (lib/actions/auth.ts). */
const ADMIN_CATEGORY_TO_ROLE = {
  SELF: "GENERAL",
  PARENTS: "GUARDIAN",
  MEDIA: "MEDIA",
  AGENT: "AGENT",
} as const;

/**
 * Create a member account and profile by hand, skipping both OTP gates.
 *
 * For intake an admin has already done off-platform — a walk-in, a phone
 * call, an agency handover — where making the person complete an email code
 * and an SMS code would be theatre: the admin is the one vouching.
 *
 * SCOPE OF THE BYPASS: it sets `isMobileVerified` and `isEmailVerified` (plus
 * `emailVerifiedAt`) so the account is not stuck behind the signup gate. It
 * does NOT weaken anything for self-service — /register and /onboarding are
 * untouched, and this path is reachable only through assertAdmin().
 *
 * A random password is generated and returned ONCE to the creating admin, so
 * the member can be handed working credentials. It is stored only as a bcrypt
 * hash, exactly like a normal signup.
 */
export async function adminCreateUserProfile(
  input: AdminCreateProfileInput,
): Promise<AdminCreateProfileResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "FORBIDDEN" };

  const fullName = input.fullName?.trim();
  const gender = input.gender?.trim();
  const dob = input.dateOfBirth?.trim();
  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!GENDERS.some((g) => g.value === gender)) {
    return { ok: false, error: "Select a gender." };
  }
  if (!dob) return { ok: false, error: "Date of birth is required." };

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) {
    return { ok: false, error: "Date of birth is not a valid date." };
  }
  if (calcAge(birthDate) < 18) {
    return { ok: false, error: "The member must be at least 18 years old." };
  }

  // Same shape the public form enforces — an admin shortcut should not seed
  // numbers the rest of the app cannot match or message.
  const mobile = normalizeBdMobile(input.mobile ?? "");
  if (!mobile) return { ok: false, error: "Enter a valid Bangladeshi mobile number." };

  // Email is optional here: a walk-in often has only a phone. One is synthesized
  // so the unique, non-null column holds something sane, and it is obviously not
  // a real inbox — nothing will ever be delivered to it.
  const suppliedEmail = input.email?.trim().toLowerCase();
  if (suppliedEmail && !suppliedEmail.includes("@")) {
    return { ok: false, error: "That email address is not valid." };
  }
  const email = suppliedEmail || `${mobile}@no-email.matchmedia.local`;

  const [emailTaken, mobileTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { mobile }, select: { id: true } }),
  ]);
  if (emailTaken) {
    return { ok: false, error: "An account with this email already exists." };
  }
  if (mobileTaken) {
    return { ok: false, error: "An account with this mobile number already exists." };
  }

  const category = input.accountCategory ?? "SELF";
  const district = input.district?.trim() || null;
  const profession = input.profession?.trim() || null;

  // An admin-chosen password is held to the same floor as self-service signup
  // (lib/actions/auth.ts), so this path cannot seed accounts weaker than the
  // ones members create themselves.
  const supplied = input.password?.trim();
  if (supplied && supplied.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const password = supplied || randomPassword();
  const generated = !supplied;

  const completionScore = computeCompletion([
    gender, birthDate, district, null, profession, null,
    null, null, null, null, null, null,
  ]);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        mobile,
        passwordHash: bcrypt.hashSync(password, 10),
        role: ADMIN_CATEGORY_TO_ROLE[category],
        accountCategory: category,
        // The bypass itself: both gates are satisfied by the admin's own
        // verification of this person, off-platform.
        isMobileVerified: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        contactPerson: category === "SELF" ? null : fullName,
        // Only a candidate gets a matrimonial profile; the other categories
        // manage someone else's, exactly as registration decides it.
        ...(category === "SELF"
          ? {
              profile: {
                create: {
                  fullName,
                  gender: gender!,
                  dateOfBirth: birthDate,
                  district,
                  profession,
                  isVerified: Boolean(input.markVerified),
                  completionScore,
                },
              },
            }
          : {}),
      },
      select: { id: true, email: true },
    });

    revalidatePath(ADMIN_USERS, "page");
    revalidateAdminNav();
    revalidatePath(BROWSE, "page");
    revalidatePath("/", "layout");

    return {
      ok: true,
      userId: user.id,
      email: user.email,
      password,
      generated,
      hasProfile: category === "SELF",
    };
  } catch (error) {
    // Unique-constraint race on email or mobile, despite the checks above.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        ok: false,
        error: "That email or mobile number was just taken. Try again.",
      };
    }

    // Anything else is returned, not rethrown. A throw here becomes an
    // unhandled Server Action rejection: Next renders the error boundary over
    // /admin/users and the admin sees a digest hash instead of what went
    // wrong, which is exactly how a missing column default stayed invisible.
    // The message is safe to show — this screen is already admin-only.
    console.error("adminCreateUserProfile failed", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Could not create the account: ${lastLine(error.message)}`
          : "Could not create the account.",
    };
  }
}

/** 14 random characters from an unambiguous alphabet. */
function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * The last non-empty line of an error message. Prisma stacks its explanation
 * over several lines and puts the actual cause last ("Null constraint
 * violation on the fields: (...)"), which is the part worth showing.
 */
function lastLine(message: string): string {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[lines.length - 1] ?? message;
}


/**
 * Upload a photo to a member's gallery on their behalf.
 *
 * For the same intake the manual-create form serves: the admin has the
 * person's photos in hand and should not have to sign in as them to attach
 * them. Because an admin is the one uploading, the image is stored APPROVED
 * rather than PENDING — sending it to the moderation queue would mean an admin
 * queuing work for an admin, and the reviewer is already here.
 *
 * Privacy defaults to PUBLIC, matching an ordinary upload, with BLURRED
 * available for a member who wants the photo-request gate.
 *
 * Takes a userId, never a profileId: the admin UI lists accounts, and
 * resolving the profile here keeps the caller from having to know the
 * difference.
 */
export async function adminUploadProfilePhoto(
  userId: string,
  formData: FormData,
): Promise<AdminResult> {
  const adminId = await assertAdmin();
  if (!adminId) return err("FORBIDDEN");

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, _count: { select: { images: true } } },
    });
    if (!profile) return err("NO_PROFILE");
    if (profile._count.images >= MAX_PHOTOS) return err("LIMIT");

    const file = formData.get("photo");
    if (!(file instanceof File)) return err("EMPTY");
    const invalid = validateUpload(file);
    if (invalid) return err(invalid);

    const privacy =
      formData.get("privacy") === "BLURRED" ? "BLURRED" : "PUBLIC";

    const { originalKey, blurredKey } = await storeProfileImage(
      profile.id,
      file,
    );

    // First photo becomes the profile photo, so a gallery always has one.
    const isPrimary = profile._count.images === 0;

    await prisma.profileImage.create({
      data: {
        profileId: profile.id,
        originalKey,
        blurredKey,
        privacy,
        isPrimary,
        moderationStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    });

    revalidatePath(ADMIN_USERS, "page");
    revalidateAdminNav();
    revalidatePath(BROWSE, "page");
    revalidatePath(PROFILE, "page");
    return ok;
  } catch (error) {
    // Returned, not rethrown: a throw here would replace the admin screen with
    // an error boundary and a digest hash instead of saying what failed.
    console.error("adminUploadProfilePhoto failed", error);
    return err(
      error instanceof Error
        ? `Upload failed: ${lastLine(error.message)}`
        : "Upload failed.",
    );
  }
}
