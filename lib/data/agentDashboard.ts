import "server-only";
import { prisma } from "@/lib/prisma";
import { signUrl } from "@/lib/storage/supabase";

export type AssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "VERIFIED"
  | "CANCELLED";

export interface AssignmentSummary {
  id: string;
  status: AssignmentStatus;
  candidateName: string;
  candidateDistrict: string;
  candidateUpazila: string;
  agentShare: number; // poisha
  assignedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
  agentNote: string | null;
}

export interface AgentDashboardData {
  isVerified: boolean;
  avatarUrl: string | null;
  assignments: AssignmentSummary[];
  /** Sum of agentShare across VERIFIED assignments, in poisha. */
  totalEarned: number;
  pendingCount: number;
  completedCount: number;
}

export async function getAgentDashboardData(
  agentUserId: string,
): Promise<AgentDashboardData> {
  const [user, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: agentUserId },
      select: { role: true, agentAvatarKey: true },
    }),
    prisma.verificationAssignment.findMany({
      where: { agentId: agentUserId },
      orderBy: { assignedAt: "desc" },
      include: {
        profile: {
          select: {
            fullName: true,
            district: true,
            upazila: true,
          },
        },
      },
    }),
  ]);

  const isVerified = user?.role === "AGENT";
  const avatarUrl = user?.agentAvatarKey ? await signUrl(user.agentAvatarKey) : null;

  const summaries: AssignmentSummary[] = assignments.map((a) => ({
    id: a.id,
    status: a.status as AssignmentStatus,
    candidateName: a.profile.fullName ?? "নাম গোপন",
    candidateDistrict: a.profile.district ?? "",
    candidateUpazila: a.profile.upazila ?? "",
    agentShare: a.agentShare,
    assignedAt: a.assignedAt,
    submittedAt: a.submittedAt,
    completedAt: a.completedAt,
    agentNote: a.agentNote,
  }));

  const totalEarned = assignments
    .filter((a) => a.status === "VERIFIED")
    .reduce((sum, a) => sum + a.agentShare, 0);

  const pendingCount = assignments.filter(
    (a) => a.status === "PENDING" || a.status === "IN_PROGRESS" || a.status === "SUBMITTED",
  ).length;

  const completedCount = assignments.filter(
    (a) => a.status === "VERIFIED" || a.status === "CANCELLED",
  ).length;

  return { isVerified, avatarUrl, assignments: summaries, totalEarned, pendingCount, completedCount };
}
