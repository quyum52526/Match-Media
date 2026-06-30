import "server-only";
import { prisma } from "@/lib/prisma";
import { signUrl } from "@/lib/storage/supabase";

export type AgencyVerificationStatus =
  | "UNVERIFIED"
  | "PENDING_APPROVAL"
  | "VERIFIED"
  | "REJECTED";

export interface AgencyClientSummary {
  id: string;
  fullName: string;
  gender: string;
  district: string;
  upazila: string;
  completionScore: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface MediaDashboardData {
  agencyName: string;
  contactPerson: string;
  agencyDistrict: string;
  agencyLogoUrl: string | null;
  hasTradeLicense: boolean;
  agencyVerificationStatus: AgencyVerificationStatus;
  isMobileVerified: boolean;
  clients: AgencyClientSummary[];
  totalCount: number;
  /** completionScore > 30 and fullName set */
  activeCount: number;
  incompleteCount: number;
}

export async function getMediaDashboardData(
  agencyUserId: string,
): Promise<MediaDashboardData> {
  const [user, clients] = await Promise.all([
    prisma.user.findUnique({
      where: { id: agencyUserId },
      select: {
        agencyName: true,
        contactPerson: true,
        agencyDistrict: true,
        agencyLogo: true,
        tradeLicenseUrl: true,
        agencyVerificationStatus: true,
        isMobileVerified: true,
      },
    }),
    prisma.profile.findMany({
      where: { referredById: agencyUserId, managedByAgency: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        gender: true,
        district: true,
        upazila: true,
        completionScore: true,
        isVerified: true,
        createdAt: true,
      },
    }),
  ]);

  // Sign the agency logo URL if present; degrade gracefully if storage is unconfigured.
  const agencyLogoUrl = user?.agencyLogo
    ? await signUrl(user.agencyLogo)
    : null;

  const activeCount = clients.filter(
    (c) => c.completionScore > 30 && Boolean(c.fullName),
  ).length;

  return {
    agencyName: user?.agencyName ?? "",
    contactPerson: user?.contactPerson ?? "",
    agencyDistrict: user?.agencyDistrict ?? "",
    agencyLogoUrl,
    hasTradeLicense: Boolean(user?.tradeLicenseUrl),
    agencyVerificationStatus:
      (user?.agencyVerificationStatus as AgencyVerificationStatus) ?? "UNVERIFIED",
    isMobileVerified: user?.isMobileVerified ?? false,
    clients: clients.map((c) => ({
      id: c.id,
      fullName: c.fullName ?? "—",
      gender: c.gender,
      district: c.district ?? "",
      upazila: c.upazila ?? "",
      completionScore: c.completionScore,
      isVerified: c.isVerified,
      createdAt: c.createdAt,
    })),
    totalCount: clients.length,
    activeCount,
    incompleteCount: clients.length - activeCount,
  };
}
