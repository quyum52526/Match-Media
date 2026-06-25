import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
 * Authoritative admin gate for admin routes/actions. Redirects to login when
 * signed out, or to `homePath` when the viewer isn't an ADMIN. Re-checks the DB
 * every call, so a demoted admin loses access at once (no stale-token window).
 * Returns the admin's user id on success.
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
  if (user?.role !== "ADMIN") redirect(homePath);
  return id;
}

/** Non-redirecting admin assertion for use inside Server Actions. */
export async function assertAdmin(): Promise<string | null> {
  const id = await getViewerId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? id : null;
}
