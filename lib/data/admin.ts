import "server-only";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { signUrls } from "@/lib/storage/supabase";
import type {
  ReportReason,
  ReportStatus,
} from "@/components/profile/types";
import type {
  AdminStats,
  AdminReport,
  AdminUser,
  PendingPhoto,
  VerificationProfile,
} from "@/components/admin/types";

// Admins see real identities (moderation needs them), so unlike the public
// views we don't apply the nameHidden placeholder here.
function realName(fullName: string | null): string {
  return fullName?.trim() || "(no name)";
}

/** Counts for the admin overview cards. */
export async function getAdminStats(): Promise<AdminStats> {
  const [pendingPhotos, openReports, unverifiedProfiles] = await Promise.all([
    prisma.profileImage.count({ where: { moderationStatus: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.profile.count({ where: { isVerified: false } }),
  ]);
  return { pendingPhotos, openReports, unverifiedProfiles };
}

/** Photos awaiting moderation, oldest first, with signed original URLs. */
export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const images = await prisma.profileImage.findMany({
    where: { moderationStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      originalKey: true,
      createdAt: true,
      profile: {
        select: { fullName: true, user: { select: { id: true, email: true } } },
      },
    },
  });
  if (images.length === 0) return [];

  const urls = await signUrls(images.map((i) => i.originalKey));
  return images
    .map((i) => {
      const url = urls.get(i.originalKey);
      if (!url) return null;
      // Agency-managed profiles (user=null) can still have photos moderated.
      return {
        id: i.id,
        url,
        ownerUserId: i.profile.user?.id ?? "",
        ownerName: realName(i.profile.fullName),
        ownerEmail: i.profile.user?.email ?? "(agency client)",
        uploadedAt: i.createdAt.toISOString(),
      } satisfies PendingPhoto;
    })
    .filter((p): p is PendingPhoto => p !== null);
}

/** Open reports, newest first, with reporter + reported identity + photo URL. */
export async function getOpenReports(): Promise<AdminReport[]> {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { email: true } },
      reportedUser: {
        select: { id: true, email: true, profile: { select: { fullName: true } } },
      },
    },
  });
  if (reports.length === 0) return [];

  // Sign any reported-photo originals in one batch.
  const imageIds = reports.map((r) => r.imageId).filter((id): id is string => !!id);
  const keyByImageId = new Map<string, string>();
  if (imageIds.length) {
    const imgs = await prisma.profileImage.findMany({
      where: { id: { in: imageIds } },
      select: { id: true, originalKey: true },
    });
    const signed = await signUrls(imgs.map((i) => i.originalKey));
    for (const img of imgs) {
      const u = signed.get(img.originalKey);
      if (u) keyByImageId.set(img.id, u);
    }
  }

  return reports.map((r) => ({
    id: r.id,
    reason: r.reason as ReportReason,
    note: r.note,
    status: r.status as ReportStatus,
    createdAt: r.createdAt.toISOString(),
    reporterEmail: r.reporter.email,
    reportedUserId: r.reportedUser.id,
    reportedName: realName(r.reportedUser.profile?.fullName ?? null),
    reportedEmail: r.reportedUser.email,
    imageUrl: r.imageId ? keyByImageId.get(r.imageId) : undefined,
  }));
}

/** All users for the admin Users tab — ordered newest first. */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      accountCategory: true,
      isPro: true,
      createdAt: true,
      profile: {
        select: {
          fullName: true,
          _count: { select: { images: true } },
        },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    accountCategory: u.accountCategory,
    isPro: u.isPro,
    profileName: u.profile?.fullName ?? null,
    hasPhotos: (u.profile?._count?.images ?? 0) > 0,
    createdAt: u.createdAt.toISOString(),
  }));
}

/** Profiles for the verification list. `filter` narrows to unverified-only. */
export async function getVerificationProfiles(
  filter: "unverified" | "all",
): Promise<VerificationProfile[]> {
  const profiles = await prisma.profile.findMany({
    where: filter === "unverified" ? { isVerified: false } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      fullName: true,
      district: true,
      dateOfBirth: true,
      isVerified: true,
      managedByAgency: true,
      user: { select: { email: true } },
    },
  });
  // Include agency-managed profiles (userId = null) too — they still need
  // verification and are keyed by their Profile id, matching the overview count.
  return profiles.map((p) => ({
    profileId: p.id,
    userId: p.userId,
    name: realName(p.fullName),
    email: p.user?.email ?? (p.managedByAgency ? "(agency client)" : ""),
    district: p.district ?? "",
    age: calcAge(p.dateOfBirth),
    isVerified: p.isVerified,
    managedByAgency: p.managedByAgency,
  }));
}
