"use server";

import { revalidatePath } from "next/cache";
import { getViewerId } from "@/lib/session";
import {
  checkEmailOtp,
  issueEmailOtp,
  type CheckEmailOtpError,
  type IssueEmailOtpError,
} from "@/lib/emailVerification";

/**
 * Session-bound wrappers around the email-OTP core (lib/emailVerification.ts).
 *
 * These are the only email-OTP entry points reachable from a browser, and they
 * always act on the caller's OWN account: the user id comes from the session,
 * never from an argument, so no request can make the platform mail a code to
 * someone else's address.
 */

const VERIFY_PATH = "/[locale]/profile/verify";
const EMAIL_GATE_PATH = "/[locale]/verify-email";

export type SendEmailOtpResult =
  | { ok: true }
  | { ok: false; error: IssueEmailOtpError };

export type VerifyEmailOtpResult =
  | { ok: true }
  | { ok: false; error: CheckEmailOtpError };

/** Send a verification code to the signed-in user's own email. */
export async function sendEmailOtp(): Promise<SendEmailOtpResult> {
  const userId = await getViewerId();
  if (!userId) return { ok: false, error: "UNAUTH" };

  const result = await issueEmailOtp(userId);
  if (result.ok) {
    revalidatePath(VERIFY_PATH, "page");
    revalidatePath(EMAIL_GATE_PATH, "page");
  }
  return result;
}

/**
 * Verify a submitted code. On success the signup gate opens, so the root layout
 * is revalidated too — the pages that redirect unverified users must re-read
 * the now-verified state.
 */
export async function verifyEmailOtp(
  code: string,
): Promise<VerifyEmailOtpResult> {
  const userId = await getViewerId();
  if (!userId) return { ok: false, error: "UNAUTH" };

  const result = await checkEmailOtp(userId, code);
  if (result.ok) {
    revalidatePath(VERIFY_PATH, "page");
    revalidatePath(EMAIL_GATE_PATH, "page");
    revalidatePath("/", "layout");
  }
  return result;
}
