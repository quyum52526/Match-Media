import "server-only";
import { prisma } from "@/lib/prisma";

export interface GuardianChildSummary {
  id: string;
  fullName: string;
  gender: string;
  district: string;
  upazila: string;
  completionScore: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface GuardianDashboardData {
  email: string;
  mobile: string | null;
  children: GuardianChildSummary[];
  totalCount: number;
  activeCount: number;
  incompleteCount: number;
}

export async function getGuardianDashboardData(
  guardianUserId: string,
): Promise<GuardianDashboardData> {
  const [user, children] = await Promise.all([
    prisma.user.findUnique({
      where: { id: guardianUserId },
      select: { email: true, mobile: true },
    }),
    prisma.profile.findMany({
      where: { referredById: guardianUserId, managedByAgency: true },
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

  const activeCount = children.filter(
    (c) => c.completionScore > 30 && Boolean(c.fullName),
  ).length;

  return {
    email: user?.email ?? "",
    mobile: user?.mobile ?? null,
    children: children.map((c) => ({
      id: c.id,
      fullName: c.fullName ?? "—",
      gender: c.gender,
      district: c.district ?? "",
      upazila: c.upazila ?? "",
      completionScore: c.completionScore,
      isVerified: c.isVerified,
      createdAt: c.createdAt,
    })),
    totalCount: children.length,
    activeCount,
    incompleteCount: children.length - activeCount,
  };
}
