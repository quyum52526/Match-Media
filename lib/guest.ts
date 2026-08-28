import "server-only";
import { cookies } from "next/headers";

/**
 * Guest / "Explore as Guest" preview mode.
 *
 * A visitor who clicks "Explore as Guest" gets a cookie (no account, no
 * session) that lets them preview read-only routes (browse, search, sample
 * profile views) without hitting the login redirect. It is NOT an auth
 * mechanism — it carries no identity and grants no access to anything
 * mutating; every restricted action still requires a real session (see
 * `useGuestGate` / `AuthGateModal`).
 */
export const GUEST_COOKIE = "mm_guest";

/** Guest preview expires after a day, same as a "come back and try again" window. */
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * Sentinel id used ONLY for read-only, personalization-free queries (browse
 * feed, recommendations) when there is no real viewer. It intentionally
 * matches no row in the DB, so `NOT: { userId: sentinel }` excludes nothing
 * and `{ viewerId: sentinel }` lookups return empty — safe because every call
 * site that uses it is a pure read. NEVER pass this into a write/upsert path
 * (e.g. ProfileViewLog, PhotoAccessRequest) — those columns have a foreign
 * key to a real User row and would throw. Guest profile views are handled by
 * `getGuestProfilePreview`, which performs no such writes.
 */
export const GUEST_VIEWER_ID = "guest-preview";

/** Whether the current request carries an active guest-preview cookie. */
export async function isGuestSession(): Promise<boolean> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value === "1";
}
