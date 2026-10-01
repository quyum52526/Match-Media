import "server-only";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";
import type { ContactGateStatus } from "@/types/contactGate";

/**
 * The single authorization gate for INITIATING contact — messaging and voice
 * calls. One helper, because two copies of this rule would drift and the looser
 * copy would become the real policy.
 *
 * The rule depends on ENABLE_SMS_OTP, because what `isMobileVerified` MEANS
 * depends on it:
 *
 *   SMS OTP ON  — `isMobileVerified` proves the member controls the number.
 *                 An SMS-verified number is a real cost to a spammer, so it is
 *                 sufficient on its own.
 *
 *   SMS OTP OFF — `isMobileVerified` only means "a well-formed number was
 *                 typed", which is free to fake and would let a throwaway
 *                 account open conversations. So we fall back to the strongest
 *                 signal that survives: the admin-granted Verified badge
 *                 (approved NID + selfie, see maybeAutoGrantBadge).
 *
 * TRADEOFF while SMS OTP is off: a member cannot message until an admin has
 * reviewed their documents. That is a deliberately high bar — it trades reach
 * for authenticity, and it makes the manual review queue latency-critical.
 *
 * This is authorization, so it is NOT itself behind a flag in the sense of being
 * skippable: whichever branch applies, a real check runs.
 */
export async function canInitiateContact(userId: string): Promise<boolean> {
  return (await getContactGateStatus(userId)).allowed;
}

/**
 * The same decision as `canInitiateContact`, plus WHY — so the UI can explain
 * the block instead of dead-ending on a disabled button.
 *
 * It is one function, not a parallel one, because a second copy of the rule
 * would drift from the boolean the server actions enforce and the UI would start
 * promising contact the action then refuses (or hiding contact that is allowed).
 * `canInitiateContact` delegates here, so there is exactly one rule.
 *
 * PENDING_REVIEW vs NEEDS_VERIFICATION matters for churn: a member whose
 * documents are already in the queue must not be sent back to the upload form,
 * because re-uploading does not move them forward and looks like the first
 * submission was lost.
 */
export async function getContactGateStatus(
  userId: string,
): Promise<ContactGateStatus> {
  const [smsOtpEnabled, user] = await Promise.all([
    isFeatureEnabled("ENABLE_SMS_OTP"),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isMobileVerified: true,
        // Document review state — only read to pick the right COPY; the
        // authorization itself still hinges on the admin-granted badge below.
        nidVerificationStatus: true,
        selfieVerificationStatus: true,
        // isVerified lives on Profile, not User.
        profile: { select: { isVerified: true } },
      },
    }),
  ]);
  if (!user) return { allowed: false, reason: "UNAUTHENTICATED" };

  if (smsOtpEnabled) {
    return user.isMobileVerified
      ? { allowed: true, reason: "OK" }
      : { allowed: false, reason: "NEEDS_MOBILE_VERIFICATION" };
  }

  if (user.profile?.isVerified) return { allowed: true, reason: "OK" };

  // Submitted and waiting beats "go verify": either document sitting in the
  // queue means the next move is the admin's, not the member's.
  const awaitingReview =
    user.nidVerificationStatus === "PENDING" ||
    user.selfieVerificationStatus === "PENDING";

  return {
    allowed: false,
    reason: awaitingReview ? "PENDING_REVIEW" : "NEEDS_VERIFICATION",
  };
}

/**
 * Whether mobile verification should count as a trust signal right now.
 *
 * Mirrors the reasoning above: with SMS OTP off, `isMobileVerified` is set for
 * everyone who typed a plausible number, so counting it would hand out a quarter
 * of the trust score for nothing and make the badge meaningless to other members.
 */
export async function mobileCountsTowardTrust(): Promise<boolean> {
  return isFeatureEnabled("ENABLE_SMS_OTP");
}
