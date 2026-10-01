import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGuestSession } from "@/lib/guest";
import { isAdminRole, isSuperAdminRole } from "@/lib/rbac";

/** The authenticated viewer's id, or null when signed out. */
export async function getViewerId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * The authenticated viewer's id, or redirect to login. Pass a locale-aware
 * login path so the user stays in their language.
 */
export async function requireViewerId(
  loginPath: string = "/login",
): Promise<string> {
  const id = await getViewerId();
  if (!id) redirect(loginPath);
  return id;
}

/**
 * The current viewer's role, read from the DB (the source of truth — role is
 * NOT carried in the JWT, so promotions/demotions take effect immediately).
 * `cache`d per request so repeated calls (e.g. Header + a page guard) hit the
 * DB once. Returns null when signed out.
 */
export const getViewerRole = cache(async (): Promise<string | null> => {
  const id = await getViewerId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return user?.role ?? null;
});

/**
 * Authoritative gate for the /admin area. Redirects to login when signed out,
 * or to `homePath` when the viewer is neither ADMIN nor SUPER_ADMIN. Re-checks
 * the DB every call, so a demoted admin loses access at once (no stale-token
 * window). Returns the admin's user id on success.
 */
export async function requireAdmin(
  loginPath: string = "/login",
  homePath: string = "/",
): Promise<string> {
  const id = await getViewerId();
  if (!id) redirect(loginPath);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!isAdminRole(user?.role)) redirect(homePath);
  return id;
}

/**
 * Owner-only gate for routes that manage feature flags, system settings or
 * anything destructive. A plain ADMIN (moderator) is sent to `deniedPath`
 * (the admin overview by default) rather than to the public home page, since
 * they ARE a legitimate admin — just not for this page.
 */
export async function requireSuperAdmin(
  loginPath: string = "/login",
  deniedPath: string = "/admin",
): Promise<string> {
  const id = await getViewerId();
  if (!id) redirect(loginPath);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!isSuperAdminRole(user?.role)) redirect(deniedPath);
  return id;
}

/**
 * The authenticated viewer's id, OR guest-preview status, without redirecting
 * a guest to login. Use on read-only routes (browse, search, sample profile
 * views) that must stay reachable from "Explore as Guest".
 *
 *   - Real session -> { viewerId, isGuest: false }
 *   - No session but guest cookie set -> { viewerId: null, isGuest: true }
 *   - Neither -> redirects to `loginPath` (same as `requireViewerId`)
 *
 * `viewerId` is null in guest mode — callers must not pass it into any
 * personalized or write path. Use `GUEST_VIEWER_ID` for read-only,
 * non-personalized queries (see lib/guest.ts) and a dedicated guest-safe
 * function (e.g. `getGuestProfilePreview`) for anything that would otherwise
 * write a per-viewer row.
 */
export async function getViewerIdOrGuest(
  loginPath: string = "/login",
): Promise<{ viewerId: string | null; isGuest: boolean }> {
  const id = await getViewerId();
  if (id) return { viewerId: id, isGuest: false };
  if (await isGuestSession()) return { viewerId: null, isGuest: true };
  redirect(loginPath);
}

/**
 * Non-redirecting admin assertion for use inside Server Actions. Admits both
 * ADMIN (moderator) and SUPER_ADMIN (owner); returns null for anyone else.
 */
export async function assertAdmin(): Promise<string | null> {
  const id = await getViewerId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return isAdminRole(user?.role) ? id : null;
}

/**
 * Non-redirecting OWNER assertion for Server Actions that change system
 * configuration or do something destructive/irreversible. Returns null for a
 * plain ADMIN, so callers return FORBIDDEN exactly as they do for a stranger.
 *
 * Every such action must gate on this rather than on assertAdmin().
 */
export async function assertSuperAdmin(): Promise<string | null> {
  const id = await getViewerId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return isSuperAdminRole(user?.role) ? id : null;
}

/**
 * Whether the current viewer is a SUPER_ADMIN. For server components that need
 * to render an editable-vs-read-only admin UI. `cache`d via getViewerRole().
 */
export async function isViewerSuperAdmin(): Promise<boolean> {
  return isSuperAdminRole(await getViewerRole());
}
