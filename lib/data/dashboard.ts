import "server-only";
import { prisma } from "@/lib/prisma";

export interface DashboardStats {
  /** Daily-unique views of the viewer's own profile (all-time). */
  profileViews: number;
  /** Photo-access requests received and still awaiting a response. */
  pendingPhotoRequests: number;
  /** Interests received and not yet accepted/declined. */
  newInterests: number;
  /** Mutually accepted interests (in either direction) — confirmed matches. */
  matches: number;
  /** First name for a greeting, or null when no name is set. */
  firstName: string | null;
}

/**
 * Aggregate counts for the signed-in user's dashboard. All counts are scoped
 * to the viewer and run in parallel.
 */
export async function getDashboardStats(
  viewerId: string,
): Promise<DashboardStats> {
  const [profile, profileViews, pendingPhotoRequests, newInterests, matches] =
    await Promise.all([
      prisma.profile.findUnique({
        where: { userId: viewerId },
        select: { fullName: true },
      }),
      prisma.profileViewLog.count({
        where: { viewedProfile: { userId: viewerId } },
      }),
      prisma.photoAccessRequest.count({
        where: { ownerId: viewerId, status: "PENDING" },
      }),
      prisma.interest.count({
        where: { receiverId: viewerId, status: "SENT" },
      }),
      prisma.interest.count({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: viewerId }, { receiverId: viewerId }],
        },
      }),
    ]);

  const firstName = profile?.fullName?.trim().split(/\s+/)[0] ?? null;

  return {
    profileViews,
    pendingPhotoRequests,
    newInterests,
    matches,
    firstName,
  };
}
