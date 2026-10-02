"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/session";
import { sendModerationEmail } from "@/lib/email/notifications";

/**
 * Admin review of role applications.
 *
 * Approval is where a second role is actually granted: the application is
 * stamped, and the User row gains the flag (plus the agency/agent identity it
 * needs) that the context switcher and the /agency and /agent dashboards read.
 * Nothing else in the app grants those flags, so this file is the one gate.
 *
 * A rejection REQUIRES a reason: it is shown to the applicant and emailed to
 * them, and "rejected, no reason given" is how an applicant ends up resubmitting
 * the same documents forever.
 */

export type AdminApplicationResult = { ok: true } | { ok: false; error: string };

const ADMIN = "/[locale]/admin";
const ADMIN_APPLICATIONS = "/[locale]/admin/applications";
const PROFILE_EDIT = "/[locale]/profile/edit";
const EXPAND = "/[locale]/profile/expand";

function done() {
  revalidatePath(ADMIN_APPLICATIONS, "page");
  // Badge counts live in the admin layout, which a page revalidation misses.
  revalidatePath(ADMIN, "layout");
  revalidatePath(PROFILE_EDIT, "page");
  revalidatePath(EXPAND, "page");
  // The header's context switcher is rendered in the root layout.
  revalidatePath("/", "layout");
}

/**
 * Approve an agency application.
 *
 * The agency identity is copied onto the User row because that is where the
 * agency dashboard, the client-management flows and the "Managed by Agency"
 * badge already read it from — a second home for the same data would leave two
 * answers to "what is this agency called". `role` is deliberately NOT changed:
 * the person keeps their primary account type (and their own profile), and the
 * new capability rides on `hasAgency`.
 */
export async function approveAgencyApplication(
  applicationId: string,
): Promise<AdminApplicationResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "FORBIDDEN" };

  const application = await prisma.agencyApplication.findUnique({
    where: { id: applicationId },
    select: {
      userId: true,
      status: true,
      agencyName: true,
      contactPerson: true,
      tradeLicenseDocumentKey: true,
    },
  });
  if (!application) return { ok: false, error: "NOT_FOUND" };
  if (application.status !== "PENDING") {
    return { ok: false, error: "ALREADY_REVIEWED" };
  }

  await prisma.$transaction([
    prisma.agencyApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    }),
    prisma.user.update({
      where: { id: application.userId },
      data: {
        hasAgency: true,
        agencyName: application.agencyName,
        contactPerson: application.contactPerson || undefined,
        tradeLicenseUrl: application.tradeLicenseDocumentKey,
        // The licence was just reviewed by hand, so the agency starts verified
        // rather than sitting in the legacy trade-licence queue as well.
        agencyVerificationStatus: "VERIFIED",
      },
    }),
  ]);

  await sendModerationEmail(application.userId, "AGENCY_ROLE_APPROVED");

  done();
  return { ok: true };
}

export async function rejectAgencyApplication(
  applicationId: string,
  reason: string,
): Promise<AdminApplicationResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "FORBIDDEN" };

  const trimmed = reason?.trim();
  if (!trimmed) return { ok: false, error: "REASON_REQUIRED" };

  const application = await prisma.agencyApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true, status: true },
  });
  if (!application) return { ok: false, error: "NOT_FOUND" };
  if (application.status !== "PENDING") {
    return { ok: false, error: "ALREADY_REVIEWED" };
  }

  await prisma.agencyApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      rejectionReason: trimmed,
      reviewedAt: new Date(),
      reviewedById: adminId,
    },
  });

  await sendModerationEmail(application.userId, "AGENCY_ROLE_REJECTED", {
    reason: trimmed,
  });

  done();
  return { ok: true };
}

/**
 * Approve an agent application: the account can now be assigned physical
 * verification jobs, and its covered districts are recorded for routing.
 */
export async function approveAgentApplication(
  applicationId: string,
): Promise<AdminApplicationResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "FORBIDDEN" };

  const application = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
    select: {
      userId: true,
      status: true,
      operatingDistricts: true,
    },
  });
  if (!application) return { ok: false, error: "NOT_FOUND" };
  if (application.status !== "PENDING") {
    return { ok: false, error: "ALREADY_REVIEWED" };
  }

  await prisma.$transaction([
    prisma.agentApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    }),
    prisma.user.update({
      where: { id: application.userId },
      data: {
        hasAgentRole: true,
        agentDistricts: application.operatingDistricts,
        // Keep the single-district column meaningful for the existing agent
        // screens, which read it as "where this agent works".
        agencyDistrict: application.operatingDistricts[0],
      },
    }),
  ]);

  await sendModerationEmail(application.userId, "AGENT_ROLE_APPROVED");

  done();
  return { ok: true };
}

export async function rejectAgentApplication(
  applicationId: string,
  reason: string,
): Promise<AdminApplicationResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "FORBIDDEN" };

  const trimmed = reason?.trim();
  if (!trimmed) return { ok: false, error: "REASON_REQUIRED" };

  const application = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true, status: true },
  });
  if (!application) return { ok: false, error: "NOT_FOUND" };
  if (application.status !== "PENDING") {
    return { ok: false, error: "ALREADY_REVIEWED" };
  }

  await prisma.agentApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      rejectionReason: trimmed,
      reviewedAt: new Date(),
      reviewedById: adminId,
    },
  });

  await sendModerationEmail(application.userId, "AGENT_ROLE_REJECTED", {
    reason: trimmed,
  });

  done();
  return { ok: true };
}
