"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { otpEmail, sendEmail } from "@/lib/email/provider";

/**
 * Email OTP, deliberately built to the same rules as the mobile flow in
 * lib/actions/otp.ts — same TTL discipline, same bcrypt-only storage, same
 * attempt cap and resend cooldown. Divergence between two OTP implementations is
 * how one of them ends up being the weak one.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const VERIFY_PATH = "/[locale]/profile/verify";

export type SendEmailOtpResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTH" | "DISABLED" | "ALREADY" | "RATE_LIMITED" | "SEND_FAILED";
    };

export type VerifyEmailOtpResult =
  | { ok: true }
  | {
      ok: false;
      error: "UNAUTH" | "DISABLED" | "NO_CODE" | "EXPIRED" | "TOO_MANY" | "INVALID";
    };

/** Six-digit numeric code, zero-padded. */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send a verification code to the signed-in user's own email.
 *
 * The address is read from the User row, never taken as a parameter — accepting
 * a caller-supplied address would turn this into an open relay for sending
 * MatchMedia-branded mail to arbitrary recipients.
 */
export async function sendEmailOtp(): Promise<SendEmailOtpResult> {
  const userId = await getViewerId();
  if (!userId) return { ok: false, error: "UNAUTH" };
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
  const message = otpEmail(code, CODE_TTL_MINUTES);

  // Send BEFORE persisting the challenge: if delivery fails there is no code to
  // enter, so storing a row first would start a cooldown against a code the user
  // never received and lock them out for a minute for no reason.
  const delivered = await sendEmail({ to: user.email, ...message });
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

  revalidatePath(VERIFY_PATH, "page");
  return { ok: true };
}

/**
 * Verify a submitted code against the latest unconsumed challenge. On success
 * marks the email verified and consumes the challenge so it cannot be replayed.
 */
export async function verifyEmailOtp(
  code: string,
): Promise<VerifyEmailOtpResult> {
  const userId = await getViewerId();
  if (!userId) return { ok: false, error: "UNAUTH" };
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
      data: { isEmailVerified: true },
    }),
    prisma.emailOtp.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  revalidatePath(VERIFY_PATH, "page");
  revalidatePath("/", "layout");
  return { ok: true };
}
