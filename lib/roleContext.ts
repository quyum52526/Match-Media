import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CONTEXT_COOKIE,
  resolveActiveContext,
  type RoleContext,
} from "@/lib/roleContextRules";

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
 * and the admin gate. The active context is only a VIEW: it is read from where
 * the person currently is, falling back to the cookie that remembers their last
 * choice, and it grants nothing. Every entitlement is re-derived from the DB
 * here, and each dashboard route checks it again — so a forged cookie or a
 * hand-typed /agency URL changes nothing a person is allowed to see.
 */

/** A year — this is a preference, not a credential. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// The context names, their home paths and the resolution rules live in
// lib/roleContextRules.ts, which the client-side account menu can import too.
// Re-exported here so server callers have one import for the whole concept.
export {
  CONTEXT_COOKIE,
  CONTEXT_PATH,
  contextFromPathname,
  isRoleContext,
  resolveActiveContext,
  type RoleContext,
} from "@/lib/roleContextRules";

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
 * The context this request should render in.
 *
 * `pathname` wins when the caller knows it (being inside /agency IS being in
 * the agency context, however the person got there), then the cookie
 * preference, then personal — see resolveActiveContext(). A revoked role
 * therefore drops the session back to the personal view on its own, with no
 * stale cookie to clear.
 *
 * Server callers rarely know the pathname: a layout gets params, not the URL.
 * The account menu is a client component and resolves it there with the same
 * rules, so this stays the cookie-based answer and the menu refines it.
 */
export async function getActiveContext(
  userId: string,
  pathname?: string | null,
): Promise<RoleContext> {
  const cookieValue = (await cookies()).get(CONTEXT_COOKIE)?.value;
  // Nothing to check against: skip the entitlement query entirely.
  if (!pathname && (!cookieValue || cookieValue === "PERSONAL")) {
    return "PERSONAL";
  }

  const entitlements = await getRoleEntitlements(userId);
  return resolveActiveContext({
    pathname,
    cookieValue,
    isEntitled: (context) => canUseContext(context, entitlements),
  });
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
