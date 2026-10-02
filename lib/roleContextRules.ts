/**
 * The pure rules behind the role context: the context names, where each one
 * lives, and how a request resolves to one.
 *
 * Separate from lib/roleContext.ts because that module is `server-only` (it
 * reads the database and the cookie jar) while the account menu that renders
 * the switcher is a client component. Both import these rules, so the answer
 * to "which context is this?" is defined once rather than once per side.
 *
 * Nothing here grants anything: these functions only decide what to HIGHLIGHT.
 * Every entitlement is re-derived from the database, and each dashboard route
 * re-checks it (see lib/roleContext.ts and the /agency and /agent pages).
 */

export type RoleContext = "PERSONAL" | "AGENCY" | "AGENT";

/** Cookie holding the last context the person chose. */
export const CONTEXT_COOKIE = "mm_context";

/** Where each context's home screen lives. */
export const CONTEXT_PATH: Record<RoleContext, string> = {
  PERSONAL: "/dashboard",
  AGENCY: "/agency/dashboard",
  AGENT: "/agent/dashboard",
};

export function isRoleContext(value: unknown): value is RoleContext {
  return value === "PERSONAL" || value === "AGENCY" || value === "AGENT";
}

/**
 * The context a path belongs to, or null when it belongs to none.
 *
 * The locale prefix is stripped first, so /en/agency/dashboard and
 * /agency/dashboard answer the same. Matching is on the whole first segment:
 * "/agency" and "/agency/..." are the agency area, while a path like
 * "/agency-terms" is not.
 */
export function contextFromPathname(
  pathname: string | null | undefined,
): RoleContext | null {
  if (!pathname) return null;
  // "/en/agency/dashboard" -> ["en", "agency", "dashboard"]
  const segments = pathname.split("/").filter(Boolean);
  // A two-letter first segment is a locale (bn / en), never a section.
  const first = segments[0]?.length === 2 ? segments[1] : segments[0];
  if (first === "agency") return "AGENCY";
  if (first === "agent") return "AGENT";
  return null;
}

/**
 * Which context to show as active: where the person actually IS, then what
 * they last chose, then personal.
 *
 * Path wins over the cookie so a bookmark or an emailed link into
 * /agency/dashboard highlights the agency immediately — without the page
 * having to write a cookie while rendering, which Next forbids anyway.
 *
 * `isEntitled` is the caller's own check (the DB on the server, the offered
 * switcher rows on the client): a path the account may not use falls through
 * to the cookie rather than claiming a role it does not hold.
 */
export function resolveActiveContext({
  pathname,
  cookieValue,
  isEntitled,
}: {
  pathname?: string | null;
  cookieValue?: string | null;
  isEntitled: (context: RoleContext) => boolean;
}): RoleContext {
  const fromPath = contextFromPathname(pathname);
  if (fromPath && isEntitled(fromPath)) return fromPath;

  if (isRoleContext(cookieValue) && isEntitled(cookieValue)) return cookieValue;

  return "PERSONAL";
}
