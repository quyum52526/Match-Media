// Feature-flag CATALOG — single source of truth for keys, defaults and copy.
//
// Deliberately free of `server-only` and of any Prisma import so the seed script
// (prisma/seedFeatureFlags.ts, plain node via tsx) can share these definitions
// with the app. Mirrors how lib/constants/plans.ts is shared with seedCatalog.ts.
// The DB-reading accessors live in lib/featureFlags.ts.

/**
 * Runtime feature flags — operational switches an admin flips without a deploy.
 *
 * These gate COST and WORKFLOW (whether to pay for an SMS, whether to run a
 * manual review queue), never authorization. Role and ownership checks stay
 * unconditional in the server actions: a flag must never be the thing standing
 * between a user and someone else's data.
 */

export const FEATURE_FLAGS = {
  /**
   * When OFF, registration and onboarding skip the SMS gateway entirely: the
   * mobile is validated by format, recorded, and accepted without a code.
   *
   * TRUST CONSEQUENCE: `User.isMobileVerified` is the hard gate on messaging and
   * voice calls, and one of the four signals in a profile's trustScore. With
   * this OFF, that flag means "a well-formed number was supplied", not "the
   * number was proven". Treat the mobile trust signal as unearned until it is
   * switched back ON.
   */
  ENABLE_SMS_OTP: {
    default: false,
    description:
      "Send a real SMS code to verify mobile numbers. OFF records the number without proving ownership.",
  },
  /**
   * The signup email gate. ON: registration mails a 6-digit code and the new
   * account cannot reach onboarding (or, for MEDIA/AGENT, its dashboard) until
   * the code is entered. OFF: no code can ever be issued, so the gate opens for
   * everyone — see isEmailGateCleared() in lib/emailVerification.ts, which
   * treats OFF as "no gate" rather than locking every signup out.
   */
  ENABLE_EMAIL_OTP: {
    default: true,
    description:
      "Require a emailed 6-digit code at signup before onboarding. OFF skips the step entirely.",
  },
  /** When OFF, the NID upload step is hidden and no NID review queue is offered. */
  ENABLE_NID_VERIFICATION: {
    default: true,
    description: "Collect NID front/back images for manual admin review.",
  },
  /** When OFF, the selfie upload step is hidden and no selfie queue is offered. */
  ENABLE_SELFIE_VERIFICATION: {
    default: true,
    description: "Collect a live selfie for manual face-match review.",
  },
  /**
   * Kill-switch for in-app messaging. When OFF, sendMessage refuses with
   * DISABLED; nothing already sent is hidden or deleted, and existing threads
   * stay readable. Authorization still runs first (see canInitiateContact) —
   * this only decides whether the feature is open for business.
   */
  ENABLE_MESSAGING: {
    default: true,
    description:
      "Let matched members send new messages. OFF blocks new messages; existing threads stay readable.",
  },
  /**
   * Kill-switch for in-app voice calling. When OFF, startCall refuses with
   * DISABLED; a call already connected is unaffected. Useful when the TURN/
   * STUN path is misbehaving and ringing phones is worse than no button.
   */
  ENABLE_VOICE_CALLS: {
    default: true,
    description:
      "Let matched members place in-app voice calls. OFF blocks new calls; connected calls are unaffected.",
  },
  /**
   * When ON, a signed-in member must hold the Verified badge before they can
   * browse. Off by default — turning it on is a hard block on the core feature.
   */
  REQUIRE_VERIFICATION_TO_BROWSE: {
    default: false,
    description:
      "Require the Verified badge before a member can browse profiles. A hard block — enable with care.",
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, value);
}
