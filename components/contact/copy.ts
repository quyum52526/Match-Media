import type { ContactGateStatus } from "@/types/contactGate";

/**
 * Which i18n sub-key and destination each blocked reason maps to.
 *
 * One table, consulted by every surface (banner, modal, inline hint), so the
 * thread, the profile page and the tooltips can never disagree about what the
 * member is supposed to do next — the bug that made the old generic error
 * useless.
 */
export type GateTone = "action" | "waiting";

export interface GateCopy {
  /** Sub-key under the `ContactGate` namespace, e.g. `needsVerification.title`. */
  key: "needsVerification" | "needsMobile" | "pending" | "guest";
  /** Where the single call-to-action goes. Absent while review is pending. */
  href?: "/profile/verify" | "/verify-mobile" | "/login";
  /** `waiting` renders amber (nothing to do); `action` renders the CTA. */
  tone: GateTone;
}

/**
 * Null when contact is allowed — callers render nothing in that case, which
 * keeps the "is it blocked?" test in one place.
 */
export function gateCopy(status: ContactGateStatus): GateCopy | null {
  if (status.allowed) return null;
  switch (status.reason) {
    case "PENDING_REVIEW":
      return { key: "pending", tone: "waiting" };
    case "NEEDS_MOBILE_VERIFICATION":
      return { key: "needsMobile", href: "/verify-mobile", tone: "action" };
    case "UNAUTHENTICATED":
      return { key: "guest", href: "/login", tone: "action" };
    case "NEEDS_VERIFICATION":
    default:
      return { key: "needsVerification", href: "/profile/verify", tone: "action" };
  }
}
