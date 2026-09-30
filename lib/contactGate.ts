import "server-only";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";

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
  const [smsOtpEnabled, user] = await Promise.all([
    isFeatureEnabled("ENABLE_SMS_OTP"),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isMobileVerified: true,
        // isVerified lives on Profile, not User.
        profile: { select: { isVerified: true } },
      },
    }),
  ]);
  if (!user) return false;

  if (smsOtpEnabled) return user.isMobileVerified;
  return Boolean(user.profile?.isVerified);
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
