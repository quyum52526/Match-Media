import "server-only";
import { prisma } from "@/lib/prisma";
import { signVerificationDoc } from "@/lib/storage/verificationDocs";

/**
 * Role applications, shaped for the screens that read them: the admin review
 * queue, and the applicant's own status view.
 *
 * Documents are handed to the admin UI as signed, expiring URLs minted here;
 * the stored keys never reach the client.
 */

export interface PendingAgencyApplication {
  id: string;
  userId: string;
  email: string;
  mobile: string | null;
  applicantName: string | null;
  agencyName: string;
  tradeLicenseNumber: string;
  officeAddress: string;
  contactPerson: string;
  tradeLicenseUrl: string | null;
  submittedAt: Date;
}

export interface PendingAgentApplication {
  id: string;
  userId: string;
  email: string;
  mobile: string | null;
  applicantName: string | null;
  nidNumber: string;
  operatingDistricts: string[];
  nidFrontUrl: string | null;
  nidBackUrl: string | null;
  policeVerificationUrl: string | null;
  submittedAt: Date;
}

const APPLICANT_SELECT = {
  email: true,
  mobile: true,
  contactPerson: true,
  profile: { select: { fullName: true } },
} as const;

/** The applicant's own name: their profile name, else the account contact. */
function applicantName(user: {
  contactPerson: string | null;
  profile: { fullName: string | null } | null;
}): string | null {
  return user.profile?.fullName?.trim() || user.contactPerson?.trim() || null;
}

export async function getPendingAgencyApplications(): Promise<
  PendingAgencyApplication[]
> {
  const rows = await prisma.agencyApplication.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: APPLICANT_SELECT } },
  });

  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      userId: r.userId,
      email: r.user.email,
      mobile: r.user.mobile,
      applicantName: applicantName(r.user),
      agencyName: r.agencyName,
      tradeLicenseNumber: r.tradeLicenseNumber,
      officeAddress: r.officeAddress,
      contactPerson: r.contactPerson,
      tradeLicenseUrl: await signVerificationDoc(r.tradeLicenseDocumentKey),
      submittedAt: r.createdAt,
    })),
  );
}

export async function getPendingAgentApplications(): Promise<
  PendingAgentApplication[]
> {
  const rows = await prisma.agentApplication.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: APPLICANT_SELECT } },
  });

  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      userId: r.userId,
      email: r.user.email,
      mobile: r.user.mobile,
      applicantName: applicantName(r.user),
      nidNumber: r.nidNumber,
      operatingDistricts: r.operatingDistricts,
      nidFrontUrl: await signVerificationDoc(r.nidFrontKey),
      nidBackUrl: await signVerificationDoc(r.nidBackKey),
      policeVerificationUrl: await signVerificationDoc(r.policeVerificationKey),
      submittedAt: r.createdAt,
    })),
  );
}

/** Queue size for the admin nav badge. */
export async function getPendingApplicationCount(): Promise<number> {
  const [agency, agent] = await Promise.all([
    prisma.agencyApplication.count({ where: { status: "PENDING" } }),
    prisma.agentApplication.count({ where: { status: "PENDING" } }),
  ]);
  return agency + agent;
}

// ---------------------------------------------------------------------------
// Applicant's own view
// ---------------------------------------------------------------------------

export interface OwnApplication {
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface OwnApplications {
  agency: OwnApplication | null;
  agent: OwnApplication | null;
}

/**
 * The latest application of each kind for this account, so the expand screen
 * can show "under review" or a rejection reason instead of an empty form.
 */
export async function getOwnApplications(
  userId: string,
): Promise<OwnApplications> {
  const [agency, agent] = await Promise.all([
    prisma.agencyApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        rejectionReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
    prisma.agentApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        rejectionReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  const shape = (
    row: typeof agency,
  ): OwnApplication | null =>
    row
      ? {
          status: row.status,
          rejectionReason: row.rejectionReason,
          submittedAt: row.createdAt,
          reviewedAt: row.reviewedAt,
        }
      : null;

  return { agency: shape(agency), agent: shape(agent) };
}
