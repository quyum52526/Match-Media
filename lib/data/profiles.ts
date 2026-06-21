import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { isProActive } from "@/lib/billing";
import { FREE_DAILY_LIMIT } from "@/lib/constants/plans";
import { heightsInRange } from "@/lib/constants/profileOptions";
import type {
  ProfileDetailView,
  ProfileSummary,
  EditableProfile,
  ViewerState,
  PhotoAccessState,
  InterestState,
  ImagePrivacy,
} from "@/components/profile/types";

// Placeholder shown when a profile chooses to hide its name.
export const HIDDEN_NAME = "নাম গোপন রাখা হয়েছে";

const EMPTY_EDITABLE: EditableProfile = {
  fullName: "",
  gender: "",
  dateOfBirth: "",
  district: "",
  upazila: "",
  profession: "",
  education: "",
  maritalStatus: "",
  height: "",
  weight: "",
  childrenStatus: "",
  familyDetails: "",
  bio: "",
  nameHidden: false,
};

/**
 * The current user's own profile shaped for the edit form. Returns blanks when
 * the user has no profile yet (so the form doubles as first-time setup).
 */
export async function getEditableProfile(
  viewerId: string,
): Promise<EditableProfile> {
  const profile = await prisma.profile.findUnique({
    where: { userId: viewerId },
  });
  if (!profile) return { ...EMPTY_EDITABLE };

  return {
    fullName: profile.fullName ?? "",
    gender: profile.gender ?? "",
    dateOfBirth: profile.dateOfBirth
      ? profile.dateOfBirth.toISOString().slice(0, 10)
      : "",
    district: profile.district ?? "",
    upazila: profile.upazila ?? "",
    profession: profile.profession ?? "",
    education: profile.education ?? "",
    maritalStatus: profile.maritalStatus ?? "",
    height: profile.height ?? "",
    weight: profile.weight ?? "",
    childrenStatus: profile.childrenStatus ?? "",
    familyDetails: profile.familyDetails ?? "",
    bio: profile.bio ?? "",
    nameHidden: profile.nameHidden,
  };
}

/** Search/filter criteria (all optional; values are canonical English). */
export interface SearchFilters {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  district?: string;
  upazila?: string;
  profession?: string;
  education?: string;
  maritalStatus?: string;
  minHeight?: string;
  maxHeight?: string;
}

/** A Date `years` ago from now (for age <-> dateOfBirth conversion). */
function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/**
 * List profiles for the browse/search grid (viewer-scoped). Excludes the
 * viewer's own profile, applies the given filters, and includes the viewer's
 * current photo-access state per card. Photos always start blurred in the
 * payload; only the viewer's access state is exposed, not the image keys.
 */
export async function getBrowseProfiles(
  viewerId: string,
  filters: SearchFilters = {},
): Promise<ProfileSummary[]> {
  const where: Prisma.ProfileWhereInput = { userId: { not: viewerId } };
  if (filters.gender) where.gender = filters.gender;
  if (filters.district) where.district = filters.district;
  if (filters.upazila) where.upazila = filters.upazila;
  if (filters.profession) where.profession = filters.profession;
  if (filters.education) where.education = filters.education;
  if (filters.maritalStatus) where.maritalStatus = filters.maritalStatus;

  // Age range -> dateOfBirth bounds. age >= minAge means born on/before
  // (today - minAge yrs); age <= maxAge means born on/after (today - maxAge-1 yrs).
  const dob: Prisma.DateTimeFilter = {};
  if (filters.minAge != null) dob.lte = yearsAgo(filters.minAge);
  if (filters.maxAge != null) dob.gte = yearsAgo(filters.maxAge + 1);
  if (dob.lte || dob.gte) where.dateOfBirth = dob;

  // Height range. Heights are stored as strings, so resolve the range to the
  // set of in-range canonical height labels and match by membership. An
  // inverted/empty range yields [] -> matches nothing (drives the empty state).
  if (filters.minHeight || filters.maxHeight) {
    where.height = { in: heightsInRange(filters.minHeight, filters.maxHeight) };
  }

  const profiles = await prisma.profile.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { isPro: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  // The viewer's photo-access state toward each listed owner.
  const ownerIds = profiles.map((p) => p.userId);
  const requests = await prisma.photoAccessRequest.findMany({
    where: { viewerId, ownerId: { in: ownerIds } },
    select: { ownerId: true, status: true },
  });
  const statusByOwner = new Map(
    requests.map((r) => [r.ownerId, r.status as PhotoAccessState]),
  );

  return profiles.map((p) => ({
    id: p.userId,
    displayName: p.nameHidden || !p.fullName ? HIDDEN_NAME : p.fullName,
    nameHidden: p.nameHidden,
    gender: p.gender,
    age: calcAge(p.dateOfBirth),
    district: p.district ?? "",
    upazila: p.upazila ?? "",
    isVerified: p.isVerified,
    isPro: p.user.isPro,
    primaryImagePrivacy: (p.images[0]?.privacy as ImagePrivacy) ?? "BLURRED",
    photoAccess: statusByOwner.get(p.userId) ?? "NONE",
  }));
}

/**
 * Build the Profile Detail view model for a given viewer.
 *
 * PRIVACY-FIRST CONTACT GATE: the owner's contact (`contact`) is included in
 * the returned payload ONLY when BOTH conditions hold —
 *   (1) the viewer has a Pro membership, AND
 *   (2) interest is mutually ACCEPTED (consent, in either direction).
 * Otherwise the field is omitted entirely, so it is never serialized to the
 * client. Just being Pro never bypasses the other person's consent.
 */
export interface ProfileViewAccess {
  allowed: boolean;
  unlimited: boolean;
  used: number;
  limit: number;
}

/**
 * Free-tier gate for opening a profile: max FREE_DAILY_LIMIT *distinct* profiles
 * per UTC day. Pro viewers (and viewing your own profile) are unlimited, and
 * re-opening a profile already seen today never counts again — the existing
 * daily-unique ProfileViewLog is reused as the counter, so this stays in lockstep
 * with the view log. Call this BEFORE getProfileForViewer (which logs the view).
 */
export async function getProfileViewAccess(
  viewerId: string,
  ownerUserId: string,
): Promise<ProfileViewAccess> {
  const unlimited = { allowed: true, unlimited: true, used: 0, limit: FREE_DAILY_LIMIT };
  if (viewerId === ownerUserId) return unlimited;

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true, proExpiresAt: true },
  });
  if (isProActive(viewer)) return unlimited;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Already viewed this profile today? Then re-opening is free.
  const owner = await prisma.profile.findUnique({
    where: { userId: ownerUserId },
    select: { id: true },
  });
  if (owner) {
    const existing = await prisma.profileViewLog.findUnique({
      where: {
        viewerId_viewedProfileId_date: {
          viewerId,
          viewedProfileId: owner.id,
          date: today,
        },
      },
    });
    if (existing) return { allowed: true, unlimited: false, used: 0, limit: FREE_DAILY_LIMIT };
  }

  const used = await prisma.profileViewLog.count({ where: { viewerId, date: today } });
  return {
    allowed: used < FREE_DAILY_LIMIT,
    unlimited: false,
    used,
    limit: FREE_DAILY_LIMIT,
  };
}

export async function getProfileForViewer(
  ownerUserId: string,
  viewerId: string,
): Promise<ProfileDetailView | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId: ownerUserId },
    include: {
      user: true,
      images: { where: { isPrimary: true }, take: 1 },
    },
  });
  if (!profile) return null;

  // Log a daily-unique profile view (skip self-views). The @@unique on
  // (viewer, profile, date) makes this idempotent per day via upsert.
  if (viewerId !== ownerUserId) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.profileViewLog.upsert({
      where: {
        viewerId_viewedProfileId_date: {
          viewerId,
          viewedProfileId: profile.id,
          date: today,
        },
      },
      create: { viewerId, viewedProfileId: profile.id, date: today },
      update: {},
    });
  }

  const viewer =
    viewerId === ownerUserId
      ? profile.user
      : await prisma.user.findUnique({ where: { id: viewerId } });

  const [photoReq, sentInterest, acceptedInterest] = await Promise.all([
    prisma.photoAccessRequest.findUnique({
      where: { viewerId_ownerId: { viewerId, ownerId: ownerUserId } },
    }),
    prisma.interest.findUnique({
      where: {
        senderId_receiverId: { senderId: viewerId, receiverId: ownerUserId },
      },
    }),
    // Mutual consent: an ACCEPTED interest in EITHER direction.
    prisma.interest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: viewerId, receiverId: ownerUserId },
          { senderId: ownerUserId, receiverId: viewerId },
        ],
      },
    }),
  ]);

  const viewerIsPro = isProActive(viewer);
  const interestAccepted = Boolean(acceptedInterest);
  const contactAuthorized = viewerIsPro && interestAccepted;

  const viewerState: ViewerState = {
    photoAccess: (photoReq?.status as PhotoAccessState) ?? "NONE",
    interest: (sentInterest?.status as InterestState) ?? "NONE",
    isPro: viewerIsPro,
  };

  const primary = profile.images[0];

  const view: ProfileDetailView = {
    id: profile.userId,
    displayName:
      profile.nameHidden || !profile.fullName ? HIDDEN_NAME : profile.fullName,
    nameHidden: profile.nameHidden,
    gender: profile.gender,
    age: calcAge(profile.dateOfBirth),
    district: profile.district ?? "",
    upazila: profile.upazila ?? "",
    profession: profile.profession ?? "",
    education: profile.education ?? "",
    maritalStatus: profile.maritalStatus ?? "",
    bio: profile.bio ?? "",
    completionScore: profile.completionScore,
    isVerified: profile.isVerified,
    isPro: isProActive(profile.user),
    primaryImagePrivacy: (primary?.privacy as ImagePrivacy) ?? "BLURRED",
    details: {
      height: profile.height ?? "",
      weight: profile.weight ?? "",
      childrenStatus: profile.childrenStatus ?? "",
      family: profile.familyDetails ?? "",
    },
    viewer: viewerState,
  };

  // Only attach contact when authorized — never serialized otherwise.
  if (contactAuthorized) {
    view.contact = {
      mobile: profile.user.mobile ?? "",
      email: profile.user.email,
    };
  }

  return view;
}
