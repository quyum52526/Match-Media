"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { getSmsProvider } from "@/lib/sms";
import { normalizeBdMobile } from "@/lib/utils";

// Tunables for the OTP lifecycle.
const CODE_TTL_MS = 5 * 60 * 1000; // a code is valid for 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // ≥60s between sends
const MAX_ATTEMPTS = 5; // wrong-code guesses before the code is locked

/** Result codes the UI localizes under the `Otp` namespace. */
export type SendOtpResult =
  | { ok: true }
  | { ok: false; error: "UNAUTH" | "INVALID_NUMBER" | "RATE_LIMITED" | "ALREADY" };

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: "UNAUTH" | "NO_CODE" | "EXPIRED" | "TOO_MANY" | "INVALID" };

const VERIFY_PATH = "/[locale]/verify-mobile";

/** Six-digit numeric code as a zero-padded string. */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generate and send a fresh mobile OTP for the current user. `mobile` is the
 * number to verify; when omitted we reuse the one already on the account (the
 * resend case). Rate-limited to one send per RESEND_COOLDOWN_MS. The plaintext
 * code is never stored — only its bcrypt hash — and never returned to the client
 * (in dev the MockSmsProvider logs it to the server console).
 */
export async function sendMobileOtp(mobile?: string): Promise<SendOtpResult> {
  const userId = await getViewerId();
  if (!userId) return { ok: false, error: "UNAUTH" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mobile: true, isMobileVerified: true },
  });
  if (!user) return { ok: false, error: "UNAUTH" };
  if (user.isMobileVerified) return { ok: false, error: "ALREADY" };

  const normalized = normalizeBdMobile(mobile ?? user.mobile ?? "");
  if (!normalized) return { ok: false, error: "INVALID_NUMBER" };

  // Cooldown: refuse if the user got a code in the last minute.
  const recent = await prisma.mobileOtp.findFirst({
    where: { userId },
    orderBy: { lastSentAt: "desc" },
    select: { lastSentAt: true },
  });
  if (recent && Date.now() - recent.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  const code = generateCode();
  const codeHash = bcrypt.hashSync(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Persist the (normalized) number on the user, and a fresh challenge. Storing
  // the mobile now means a later resend works without re-entering it.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { mobile: normalized },
    }),
    prisma.mobileOtp.create({
      data: { userId, mobile: normalized, codeHash, expiresAt },
    }),
  ]);

  // SMS send must never 500 the action — surface a generic failure if it throws.
  try {
    await getSmsProvider().send(
      normalized,
      `MatchMedia: your verification code is ${code}. It expires in 5 minutes.`,
    );
  } catch (smsError) {
    console.error("OTP SMS send failed", smsError);
  }

  revalidatePath(VERIFY_PATH, "page");
  return { ok: true };
}

/**
 * Verify a submitted code against the latest unconsumed challenge. On success
 * marks the user verified and consumes the challenge so the code can't be
 * reused. Wrong codes increment `attempts`; after MAX_ATTEMPTS the code is dead
 * (the user must request a new one).
 */
export async function verifyMobileOtp(code: string): Promise<VerifyOtpResult> {
  const userId = await getViewerId();
  if (!userId) return { ok: false, error: "UNAUTH" };

  const challenge = await prisma.mobileOtp.findFirst({
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

  const matches = bcrypt.compareSync(code.trim(), challenge.codeHash);
  if (!matches) {
    await prisma.mobileOtp.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "INVALID" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isMobileVerified: true },
    }),
    prisma.mobileOtp.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  revalidatePath(VERIFY_PATH, "page");
  return { ok: true };
}
