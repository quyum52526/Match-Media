/**
 * Role-based access control — the single definition of the admin hierarchy.
 *
 *   SUPER_ADMIN  >  ADMIN  >  everyone else
 *
 * SUPER_ADMIN is the platform owner: everything a moderator can do, plus
 * feature flags, system settings and sensitive/destructive operations.
 * ADMIN is a moderator: content review and verification approvals only.
 *
 * Pure predicates with no DB or session access, so client components can
 * import them for cosmetic UI. They are NEVER the security boundary — every
 * route and Server Action re-reads the role from the DB via lib/session.ts.
 */

/** Mirrors the Prisma `Role` enum. */
export type AppRole =
  | "GENERAL"
  | "GUARDIAN"
  | "MEDIA"
  | "AGENT"
  | "ADMIN"
  | "SUPER_ADMIN";

/** Roles that may reach the /admin area at all. */
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/** True for a moderator OR the owner — i.e. anyone allowed into /admin. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** True only for the owner. Gates flags, system config and destructive work. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * NOTE: feature flags are NOT defined here. The catalog lives in
 * lib/constants/featureFlags.ts and is read through lib/featureFlags.ts —
 * one catalog, so a key cannot exist in two places with two defaults.
 * Flipping a flag is SUPER_ADMIN-only; see updateFeatureFlag in
 * lib/actions/admin.ts.
 */
