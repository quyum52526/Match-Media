import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { signUrl, signUrls } from "@/lib/storage/supabase";
import { isProActive } from "@/lib/billing";
import { maskEmail, maskPhone } from "@/lib/privacy";
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

/**
 * Fetch a client profile for editing by a MEDIA agency.
 * Returns null if the profile doesn't exist or isn't owned by this agency —
 * callers must treat null as a 403 / not-found.
 */
export async function getClientEditableProfile(
  agencyUserId: string,
  clientProfileId: string,
): Promise<EditableProfile | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: clientProfileId },
  });
  // Ownership check: must be a managed profile referred by this specific agency.
  if (
    !profile ||
    !profile.managedByAgency ||
    profile.referredById !== agencyUserId
  ) {
    return null;
  }

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
/** Map a manager's accountCategory to the badge discriminant used on the card. */
function resolveManagerType(
  category: string | null,
): "GUARDIAN" | "MEDIA" | null {
  if (category === "PARENTS") return "GUARDIAN";
  if (category === "MEDIA") return "MEDIA";
  return null;
}

/**
 * List profiles for the browse/search grid (viewer-scoped). Excludes the
 * viewer's own profile, applies the given filters, and includes the viewer's
 * current photo-access state per card. Photos always start blurred in the
 * payload; only the viewer's access state is exposed, not the image keys.
 *
 * MEDIA agencies and ADMINs see all profiles including agency-managed ones
 * (userId = null). Regular users only see profiles backed by a User account.
 */
export async function getBrowseProfiles(
  viewerId: string,
  filters: SearchFilters = {},
  viewerRole?: string | null,
  viewerCategory?: string | null,
): Promise<ProfileSummary[]> {
  const isPrivilegedViewer =
    viewerRole === "ADMIN" || viewerCategory === "MEDIA" || viewerCategory === "PARENTS";

  // Only true candidate profiles belong in the browse feed:
  //   • managed profiles (userId = null) — created by MEDIA agencies or PARENTS
  //   • self-registered candidates (user.accountCategory = "SELF")
  //
  // Manager/system accounts (PARENTS, MEDIA, AGENT, ADMIN) must never appear
  // as candidates even if they have a stale Profile row in the DB.
  //
  // Privileged viewers (MEDIA/PARENTS/ADMIN) see both arms.
  // Regular users only see the SELF arm — managed profiles (userId = null) are
  // hidden from them. We must use an explicit OR rather than `NOT: { userId: viewerId }`
  // because SQL treats `NULL != $id` as NULL (not TRUE), silently dropping those rows.
  const selfCandidateArm: Prisma.ProfileWhereInput = {
    userId: { not: null },
    NOT: { userId: viewerId },
    user: { accountCategory: "SELF" },
  };

  // Managed profiles (userId = null, created by PARENTS/MEDIA agencies) are
  // always included in the browse feed for every viewer. The isPrivilegedViewer
  // flag only widens *other* access controls — it must not gate managed profiles.
  const where: Prisma.ProfileWhereInput = {
    OR: [{ userId: null }, selfCandidateArm],
  };
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
      user: {
        select: {
          isPro: true,
          isMobileVerified: true,
          accountCategory: true,
          nidVerificationStatus: true,
          selfieVerificationStatus: true,
        },
      },
      // For managed profiles (userId = null), fetch the manager's category so we
      // can show the correct "Managed by Parents / Agency" badge on the card.
      referredBy: { select: { accountCategory: true } },
      // Only an APPROVED primary photo is ever shown to other viewers
      // (pre-moderation: PENDING/REJECTED photos never leave the server).
      images: { where: { isPrimary: true, moderationStatus: "APPROVED" }, take: 1 },
    },
  });

  // Photo-access state only applies to profiles that have a User account.
  // Managed profiles (userId = null) have no ownerId, so they always show as "NONE".
  const ownerIds = profiles.map((p) => p.userId).filter((id): id is string => id !== null);
  const requests = ownerIds.length
    ? await prisma.photoAccessRequest.findMany({
        where: { viewerId, ownerId: { in: ownerIds } },
        select: { ownerId: true, status: true },
      })
    : [];
  const statusByOwner = new Map(
    requests.map((r) => [r.ownerId, r.status as PhotoAccessState]),
  );

  // Pick the viewer-appropriate storage key per profile: the ORIGINAL only when
  // the photo is PUBLIC or the viewer is APPROVED, otherwise the blurred teaser.
  // The original key is never signed (and so never leaks) for gated viewers.
  const keyToSign: string[] = [];
  for (const p of profiles) {
    const img = p.images[0];
    if (!img) continue;
    const access = p.userId ? (statusByOwner.get(p.userId) ?? "NONE") : "NONE";
    const revealed = img.privacy === "PUBLIC" || access === "APPROVED";
    keyToSign.push(revealed ? img.originalKey : img.blurredKey);
  }
  const signed = await signUrls(keyToSign);

  return profiles.map((p) => {
    // For managed profiles (userId = null) use the Profile.id as the card
    // identifier so they get a unique, stable key in the grid.
    const cardId = p.userId ?? p.id;
    const img = p.images[0];
    const access: PhotoAccessState = p.userId
      ? (statusByOwner.get(p.userId) ?? "NONE")
      : "NONE";
    const revealed = !!img && (img.privacy === "PUBLIC" || access === "APPROVED");
    const key = img ? (revealed ? img.originalKey : img.blurredKey) : undefined;
    return {
      id: cardId,
      displayName: p.nameHidden || !p.fullName ? HIDDEN_NAME : p.fullName,
      nameHidden: p.nameHidden,
      gender: p.gender,
      age: calcAge(p.dateOfBirth),
      district: p.district ?? "",
      upazila: p.upazila ?? "",
      isVerified: p.isVerified,
      isPro: p.user?.isPro ?? false,
      managedBy: resolveManagerType(p.referredBy?.accountCategory ?? null),
      primaryImagePrivacy: (img?.privacy as ImagePrivacy) ?? "BLURRED",
      imageUrl: key ? signed.get(key) : undefined,
      photoAccess: access,
      // 4 trust signals × 25 pts: verified badge, mobile OTP, NID approved, selfie approved
      trustScore: Math.round(
        (
          [
            p.isVerified,
            p.user?.isMobileVerified ?? false,
            p.user?.nidVerificationStatus === "APPROVED",
            p.user?.selfieVerificationStatus === "APPROVED",
          ].filter(Boolean).length / 4
        ) * 100,
      ),
    };
  });
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
  profileId: string,
): Promise<ProfileViewAccess> {
  const unlimited = { allowed: true, unlimited: true, used: 0, limit: FREE_DAILY_LIMIT };
  if (viewerId === profileId) return unlimited;

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true, proExpiresAt: true },
  });
  if (isProActive(viewer)) return unlimited;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Resolve the Profile row by userId OR profile.id (managed profiles have no userId).
  const owner = await prisma.profile.findFirst({
    where: { OR: [{ userId: profileId }, { id: profileId }] },
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
  profileId: string,
  viewerId: string,
): Promise<ProfileDetailView | null> {
  // Look up by userId OR profile.id — managed profiles have userId = null and
  // are identified by their profile.id in the browse feed.
  const profile = await prisma.profile.findFirst({
    where: { OR: [{ userId: profileId }, { id: profileId }] },
    include: {
      user: true,
      referredBy: { select: { accountCategory: true } },
      // Pre-moderation: only an APPROVED primary photo is served to viewers.
      images: { where: { isPrimary: true, moderationStatus: "APPROVED" }, take: 1 },
    },
  });
  if (!profile) return null;

  // For managed profiles userId is null; profileUser may be null.
  const profileUser = profile.user;

  // Social actions (interest, photo-access, messages) target the account that
  // owns this profile. For managed profiles (userId = null) we route to the
  // parent/agency's User account via referredById, so they receive the interest
  // or message on their child's/client's behalf.
  const ownerUserId = profile.userId ?? profile.referredById ?? null;

  // Log a daily-unique profile view (skip self-views and managed profiles with
  // no user account, since there's no meaningful "owner" to attribute the view to).
  if (ownerUserId && viewerId !== ownerUserId) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    try {
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
    } catch (e: unknown) {
      // P2002 = unique constraint violation: a concurrent request already logged
      // this view for today. Safe to ignore — the record exists, view is counted.
      if ((e as { code?: string })?.code !== "P2002") throw e;
    }
  }

  const viewer = ownerUserId
    ? viewerId === ownerUserId
      ? profileUser
      : await prisma.user.findUnique({ where: { id: viewerId } })
    : await prisma.user.findUnique({ where: { id: viewerId } });

  // Social features (photo requests, interests, messaging) require the profile
  // to have a User account. Managed profiles get neutral/locked defaults.
  const [photoReq, sentInterest, acceptedInterest] = ownerUserId
    ? await Promise.all([
        prisma.photoAccessRequest.findUnique({
          where: { viewerId_ownerId: { viewerId, ownerId: ownerUserId } },
        }),
        prisma.interest.findUnique({
          where: {
            senderId_receiverId: { senderId: viewerId, receiverId: ownerUserId },
          },
        }),
        prisma.interest.findFirst({
          where: {
            status: "ACCEPTED",
            OR: [
              { senderId: viewerId, receiverId: ownerUserId },
              { senderId: ownerUserId, receiverId: viewerId },
            ],
          },
        }),
      ])
    : [null, null, null];

  const viewerIsPro = isProActive(viewer);

  const viewerState: ViewerState = {
    photoAccess: (photoReq?.status as PhotoAccessState) ?? "NONE",
    interest: (sentInterest?.status as InterestState) ?? "NONE",
    isPro: viewerIsPro,
    isMatched: Boolean(acceptedInterest),
  };

  const primary = profile.images[0];

  const photoRevealed =
    !!primary &&
    (primary.privacy === "PUBLIC" || photoReq?.status === "APPROVED");
  const imageUrl = primary
    ? (await signUrl(photoRevealed ? primary.originalKey : primary.blurredKey)) ??
      undefined
    : undefined;

  const view: ProfileDetailView = {
    // Use userId when available; fall back to referredById (parent/agency) so
    // social actions are routed to them, finally to profile.id as a last resort.
    id: profile.userId ?? profile.referredById ?? profile.id,
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
    isPro: isProActive(profileUser),
    managedBy: resolveManagerType(profile.referredBy?.accountCategory ?? null),
    primaryImagePrivacy: (primary?.privacy as ImagePrivacy) ?? "BLURRED",
    imageUrl,
    details: {
      height: profile.height ?? "",
      weight: profile.weight ?? "",
      childrenStatus: profile.childrenStatus ?? "",
      family: profile.familyDetails ?? "",
    },
    verifications: {
      mobile: profileUser?.isMobileVerified ?? false,
      email:  false,
      photo:  profile.isVerified,
      nid:    false,
    },
    viewer: viewerState,
    // STRICT PRIVACY: only masked strings ever leave the server — the raw
    // phone/email are never serialized to the client, matched or not.
    maskedContact: profileUser
      ? {
          phone: profileUser.mobile ? maskPhone(profileUser.mobile) : undefined,
          email: maskEmail(profileUser.email),
        }
      : undefined,
  };

  return view;
}
