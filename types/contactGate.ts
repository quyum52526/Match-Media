/**
 * Client-safe view model for the contact gate (messaging + voice calls).
 *
 * Lives in `types/` rather than next to `lib/contactGate.ts` because the server
 * module is `import "server-only"`: client components need the SHAPE of the
 * answer without pulling Prisma or the flag reader into the browser bundle.
 */

/**
 * Why contact is (not) allowed. One reason per distinct thing the member has to
 * DO next, so the UI never has to re-derive the instruction from booleans:
 *
 *   OK                        → nothing to do; composer and call button are live.
 *   UNAUTHENTICATED           → no session (guest preview).
 *   NEEDS_MOBILE_VERIFICATION → SMS OTP is live and the number isn't confirmed.
 *   NEEDS_VERIFICATION        → documents not submitted (or rejected) → /profile/verify.
 *   PENDING_REVIEW            → documents submitted, waiting on an admin. Nothing
 *                               the member can do but wait, so the copy must not
 *                               push them back into the upload form.
 */
export type ContactGateReason =
  | "OK"
  | "UNAUTHENTICATED"
  | "NEEDS_MOBILE_VERIFICATION"
  | "NEEDS_VERIFICATION"
  | "PENDING_REVIEW";

/** The gate's answer, shaped for rendering. */
export interface ContactGateStatus {
  /** True only when `reason === "OK"`. Mirrors `canInitiateContact`. */
  allowed: boolean;
  reason: ContactGateReason;
}

/** The gate decision for a viewer with no session — guest previews. */
export const GUEST_CONTACT_GATE: ContactGateStatus = {
  allowed: false,
  reason: "UNAUTHENTICATED",
};
