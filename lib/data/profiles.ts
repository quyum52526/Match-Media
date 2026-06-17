import "server-only";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
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

/**
 * List profiles for the browse grid (viewer-scoped). Excludes the viewer's own
 * profile and includes the viewer's current photo-access state per card.
 * Photos always start blurred in the payload; only the viewer's access state
 * is exposed, not the underlying image keys.
 */
export async function getBrowseProfiles(
  viewerId: string,
): Promise<ProfileSummary[]> {
  const profiles = await prisma.profile.findMany({
    where: { userId: { not: viewerId } },
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

  const viewerIsPro = viewer?.isPro ?? false;
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
    isPro: profile.user.isPro,
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
