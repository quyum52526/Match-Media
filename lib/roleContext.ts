import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Multi-role context.
 *
 * One login can hold more than one role: a member looking for a partner may
 * also run a marriage-media agency, or work as a verification agent. Rather
 * than a second account per role (which the unique email/mobile forbid anyway),
 * the extra roles are flags on the same User, and the header lets the person
 * switch which one they are currently acting as.
 *
 * `role` on the User row is unchanged and still the account's primary identity
 * and the admin gate. The active context is a VIEW preference, kept in a
 * cookie, and it grants nothing: every entitlement is re-derived from the DB
 * here, and each dashboard route checks it again. A forged cookie therefore
 * changes nothing a person is allowed to see.
 */

export type RoleContext = "PERSONAL" | "AGENCY" | "AGENT";

/** Cookie holding the last context the person chose. */
export const CONTEXT_COOKIE = "mm_context";

/** A year — this is a preference, not a credential. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Where each context's home screen lives. */
export const CONTEXT_PATH: Record<RoleContext, string> = {
  PERSONAL: "/dashboard",
  AGENCY: "/agency/dashboard",
  AGENT: "/agent/dashboard",
};

/** How far along a secondary role is for this account. */
export type RoleState = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface RoleEntitlements {
  agency: RoleState;
  agent: RoleState;
  /** The approved agency's name, for the switcher label. */
  agencyName: string | null;
  /** True when at least one secondary role is approved. */
  hasSecondaryRole: boolean;
}

export function isRoleContext(value: unknown): value is RoleContext {
  return value === "PERSONAL" || value === "AGENCY" || value === "AGENT";
}

/**
 * What this account may act as, and what it has pending.
 *
 * An approved role comes from the flag an admin set (`hasAgency` /
 * `hasAgentRole`); accounts that registered directly as MEDIA or AGENT are
 * backfilled to the same flags, so legacy and application-granted roles are
 * indistinguishable here on purpose.
 *
 * PENDING / REJECTED are read from the latest application, and only shown when
 * the role is not already approved — once someone operates an agency, the state
 * of an old application is noise.
 *
 * `cache`d per request: the header, a page guard and a switcher can all ask
 * without repeating the queries.
 */
export const getRoleEntitlements = cache(
  async (userId: string): Promise<RoleEntitlements> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasAgency: true,
        hasAgentRole: true,
        agencyName: true,
        agencyApplications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, agencyName: true },
        },
        agentApplications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    });

    if (!user) {
      return {
        agency: "NONE",
        agent: "NONE",
        agencyName: null,
        hasSecondaryRole: false,
      };
    }

    const agency: RoleState = user.hasAgency
      ? "APPROVED"
      : (user.agencyApplications[0]?.status ?? "NONE");
    const agent: RoleState = user.hasAgentRole
      ? "APPROVED"
      : (user.agentApplications[0]?.status ?? "NONE");

    return {
      agency,
      agent,
      agencyName: user.agencyName ?? user.agencyApplications[0]?.agencyName ?? null,
      hasSecondaryRole: agency === "APPROVED" || agent === "APPROVED",
    };
  },
);

/** Whether this account may currently act in `context`. */
export function canUseContext(
  context: RoleContext,
  entitlements: RoleEntitlements,
): boolean {
  if (context === "PERSONAL") return true;
  if (context === "AGENCY") return entitlements.agency === "APPROVED";
  return entitlements.agent === "APPROVED";
}

/**
 * The context this request should render in: the person's choice when they are
 * still entitled to it, otherwise PERSONAL. A revoked role therefore drops the
 * session back to the personal view on its own, with no stale cookie to clear.
 */
export async function getActiveContext(userId: string): Promise<RoleContext> {
  const raw = (await cookies()).get(CONTEXT_COOKIE)?.value;
  if (!isRoleContext(raw) || raw === "PERSONAL") return "PERSONAL";
  const entitlements = await getRoleEntitlements(userId);
  return canUseContext(raw, entitlements) ? raw : "PERSONAL";
}

/**
 * Remember the chosen context. Called only after the caller has confirmed the
 * entitlement — the cookie records a preference and is never trusted as proof.
 */
export async function setActiveContext(context: RoleContext): Promise<void> {
  (await cookies()).set(CONTEXT_COOKIE, context, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
