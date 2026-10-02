import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { otpEmail, sendEmail } from "@/lib/email/provider";

/**
 * Email-OTP core: issuing a code, checking one, and the signup gate that says
 * whether a user may proceed into onboarding.
 *
 * Lives outside lib/actions/emailOtp.ts because registration has to issue a
 * code BEFORE the user is signed in — a "use server" module can only export
 * actions, and an action taking a `userId` would let anyone mail a code to any
 * account. The actions in lib/actions/emailOtp.ts are thin session-bound
 * wrappers around these functions, so both callers share one implementation.
 *
 * The rules mirror the mobile flow in lib/actions/otp.ts on purpose: same
 * bcrypt-only storage, same attempt cap, same resend cooldown. Divergence
 * between two OTP implementations is how one of them ends up being the weak one.
 */

export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const CODE_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

export type IssueEmailOtpError =
  | "UNAUTH"
  | "DISABLED"
  | "ALREADY"
  | "RATE_LIMITED"
  | "SEND_FAILED";

export type CheckEmailOtpError =
  | "UNAUTH"
  | "DISABLED"
  | "NO_CODE"
  | "EXPIRED"
  | "TOO_MANY"
  | "INVALID";

export type IssueEmailOtpResult =
  | { ok: true }
  | { ok: false; error: IssueEmailOtpError };

export type CheckEmailOtpResult =
  | { ok: true }
  | { ok: false; error: CheckEmailOtpError };

/** Six-digit numeric code, zero-padded. */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Whether this user may move past the email gate: either their address is
 * verified, or the feature is switched off entirely.
 *
 * With ENABLE_EMAIL_OTP off nobody can ever obtain a code, so treating the gate
 * as closed would lock every new signup out of onboarding. Off therefore means
 * "no gate" — the flag is the on/off switch for the whole step, not just for
 * sending mail.
 */
export async function isEmailGateCleared(userId: string): Promise<boolean> {
  if (!(await isFeatureEnabled("ENABLE_EMAIL_OTP"))) return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEmailVerified: true },
  });
  // An unknown user id has nothing to gate; the caller's own auth check owns
  // that case and would have redirected already.
  return user?.isEmailVerified ?? true;
}

/**
 * Generate a code, email it, and store only its hash.
 *
 * The address always comes from the User row, never from a caller — accepting a
 * supplied address would turn this into an open relay for MatchMedia-branded
 * mail to arbitrary recipients.
 */
export async function issueEmailOtp(
  userId: string,
): Promise<IssueEmailOtpResult> {
  if (!(await isFeatureEnabled("ENABLE_EMAIL_OTP"))) {
    return { ok: false, error: "DISABLED" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, isEmailVerified: true },
  });
  if (!user) return { ok: false, error: "UNAUTH" };
  if (user.isEmailVerified) return { ok: false, error: "ALREADY" };

  // Cooldown: refuse if a code went out within the last minute.
  const recent = await prisma.emailOtp.findFirst({
    where: { userId },
    orderBy: { lastSentAt: "desc" },
    select: { lastSentAt: true },
  });
  if (recent && Date.now() - recent.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  const code = generateCode();

  // Send BEFORE persisting the challenge: if delivery fails there is no code to
  // enter, so storing a row first would start a cooldown against a code the user
  // never received and lock them out for a minute for no reason.
  const delivered = await sendEmail({
    to: user.email,
    ...otpEmail(code, CODE_TTL_MINUTES),
  });
  if (!delivered) return { ok: false, error: "SEND_FAILED" };

  await prisma.emailOtp.create({
    data: {
      userId,
      email: user.email,
      // Plaintext is never stored, matching the mobile flow.
      codeHash: bcrypt.hashSync(code, 10),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return { ok: true };
}

/**
 * Check a submitted code against the latest unconsumed challenge. On success
 * the address is marked verified (`isEmailVerified` plus the `emailVerifiedAt`
 * timestamp) and the challenge is consumed so it cannot be replayed.
 */
export async function checkEmailOtp(
  userId: string,
  code: string,
): Promise<CheckEmailOtpResult> {
  if (!(await isFeatureEnabled("ENABLE_EMAIL_OTP"))) {
    return { ok: false, error: "DISABLED" };
  }

  const challenge = await prisma.emailOtp.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false, error: "NO_CODE" };
  if (challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "EXPIRED" };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "TOO_MANY" };
  }

  if (!bcrypt.compareSync(code.trim(), challenge.codeHash)) {
    await prisma.emailOtp.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "INVALID" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, emailVerifiedAt: new Date() },
    }),
    prisma.emailOtp.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
