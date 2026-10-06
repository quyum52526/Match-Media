import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { PUBLIC_URL_TTL, signUrls } from "@/lib/storage/supabase";
import { isProActive } from "@/lib/billing";
import { mobileCountsTowardTrust } from "@/lib/contactGate";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { FREE_DAILY_LIMIT } from "@/lib/constants/plans";
import { heightsInRange } from "@/lib/constants/profileOptions";
import { buildFamilyBackground } from "@/lib/data/familyDetails";
import { isAdminRole } from "@/lib/rbac";
import type {
  ProfileDetailView,
  ProfileSummary,
  EditableProfile,
  ViewerState,
  PhotoAccessState,
  InterestState,
  ImagePrivacy,
  ModerationStatus,
  ProfilePhoto,
} from "@/components/profile/types";

// Placeholder shown when a profile chooses to hide its name.
export const HIDDEN_NAME = "নাম গোপন রাখা হয়েছে";

const EMPTY_EDITABLE: EditableProfile = {
  fullName: "",
  gender: "",
  dateOfBirth: "",
  district: "",
  upazila: "",
  religion: "",
  sect: "",
  caste: "",
  profession: "",
  education: "",
  maritalStatus: "",
  height: "",
  weight: "",
  childrenStatus: "",
  familyDetails: "",
  fatherProfession: "",
  fatherStatus: "",
  motherProfession: "",
  motherStatus: "",
  numberOfBrothers: "",
  brothersDetails: "",
  numberOfSisters: "",
  sistersDetails: "",
  paternalBackground: "",
  maternalBackground: "",
  familyClass: "",
  familyType: "",
  educationInstitute: "",
  educationMajor: "",
  diet: "",
  smokingStatus: "",
  bio: "",
  nameHidden: false,
};

/**
 * Map a Profile row to the edit-form shape. Single source of truth for both the
 * self-edit and the agency client-edit paths, so a new profile field can never
 * be wired into one form and silently missed by the other.
 */
function toEditableProfile(profile: {
  fullName: string | null;
  gender: string;
  dateOfBirth: Date;
  district: string | null;
  upazila: string | null;
  religion: string | null;
  sect: string | null;
  caste: string | null;
  profession: string | null;
  education: string | null;
  maritalStatus: string | null;
  height: string | null;
  weight: string | null;
  childrenStatus: string | null;
  familyDetails: string | null;
  fatherProfession: string | null;
  fatherStatus: string | null;
  motherProfession: string | null;
  motherStatus: string | null;
  numberOfBrothers: number | null;
  brothersDetails: string | null;
  numberOfSisters: number | null;
  sistersDetails: string | null;
  paternalBackground: string | null;
  maternalBackground: string | null;
  familyClass: string | null;
  familyType: string | null;
  educationInstitute: string | null;
  educationMajor: string | null;
  diet: string | null;
  smokingStatus: string | null;
  bio: string | null;
  nameHidden: boolean;
}): EditableProfile {
  return {
    fullName: profile.fullName ?? "",
    gender: profile.gender ?? "",
    dateOfBirth: profile.dateOfBirth
      ? profile.dateOfBirth.toISOString().slice(0, 10)
      : "",
    district: profile.district ?? "",
    upazila: profile.upazila ?? "",
    religion: profile.religion ?? "",
    sect: profile.sect ?? "",
    caste: profile.caste ?? "",
    profession: profile.profession ?? "",
    education: profile.education ?? "",
    maritalStatus: profile.maritalStatus ?? "",
    height: profile.height ?? "",
    weight: profile.weight ?? "",
    childrenStatus: profile.childrenStatus ?? "",
    familyDetails: profile.familyDetails ?? "",
    fatherProfession: profile.fatherProfession ?? "",
    fatherStatus: profile.fatherStatus ?? "",
    motherProfession: profile.motherProfession ?? "",
    motherStatus: profile.motherStatus ?? "",
    numberOfBrothers: profile.numberOfBrothers?.toString() ?? "",
    brothersDetails: profile.brothersDetails ?? "",
    numberOfSisters: profile.numberOfSisters?.toString() ?? "",
    sistersDetails: profile.sistersDetails ?? "",
    paternalBackground: profile.paternalBackground ?? "",
    maternalBackground: profile.maternalBackground ?? "",
    familyClass: profile.familyClass ?? "",
    familyType: profile.familyType ?? "",
    educationInstitute: profile.educationInstitute ?? "",
    educationMajor: profile.educationMajor ?? "",
    diet: profile.diet ?? "",
    smokingStatus: profile.smokingStatus ?? "",
    bio: profile.bio ?? "",
    nameHidden: profile.nameHidden,
  };
}

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

  return toEditableProfile(profile);
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

  return toEditableProfile(profile);
}

/** Search/filter criteria (all optional; values are canonical English). */
export interface SearchFilters {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  district?: string;
  upazila?: string;
  religion?: string;
  sect?: string;
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
 * How a profile's display photo is picked: the photo flagged primary, else the
 * earliest one in gallery order. Filtering on `isPrimary: true` alone left a
 * profile with no display photo whenever no row carried the flag (e.g. photos
 * uploaded before the primary rule, or a primary still awaiting moderation
 * while an older photo is approved) — it rendered as an empty frame.
 */
const PRIMARY_IMAGE_ORDER: Prisma.ProfileImageOrderByWithRelationInput[] = [
  { isPrimary: "desc" },
  { sortOrder: "asc" },
  { createdAt: "asc" },
];

/**
 * Shared Prisma `include` for a browse/recommendation card. Kept as one const
 * so the main grid and the "Recommended for You" strip fetch identical shapes
 * and hydrate through the same code path (hydrateProfileCards).
 */
export const BROWSE_CARD_SELECT = {
  // A `select`, not an `include`: an include returns every Profile column, and
  // the row has ~35 of them (bio, familyDetails, the religion/lifestyle fields,
  // timestamps) while a card renders 10. The feed fetches many rows at once, so
  // the unused columns are the bulk of the payload.
  id: true,
  userId: true,
  fullName: true,
  nameHidden: true,
  gender: true,
  dateOfBirth: true,
  district: true,
  upazila: true,
  isVerified: true,
  isFeatured: true,
  user: {
    select: {
      isPro: true,
      isMobileVerified: true,
      nidVerificationStatus: true,
      selfieVerificationStatus: true,
    },
  },
  // For managed profiles (userId = null), fetch the manager's category so we
  // can show the correct "Managed by Parents / Agency" badge on the card.
  referredBy: { select: { accountCategory: true } },
  // Only an APPROVED primary photo is ever shown to other viewers
  // (pre-moderation: PENDING/REJECTED photos never leave the server).
  // Just the three fields the reveal decision needs — not moderation notes,
  // reviewer ids or timestamps.
  images: {
    where: { moderationStatus: "APPROVED" },
    orderBy: PRIMARY_IMAGE_ORDER,
    select: { privacy: true, originalKey: true, blurredKey: true },
    take: 1,
  },
} satisfies Prisma.ProfileSelect;

/**
 * The profile owner's User fields the detail view actually consumes: Pro status,
 * the mobile-verified badge, and the contact pair that gets masked.
 *
 * Explicit because `user: true` returns the whole row — which means pulling
 * `passwordHash`, the NID/selfie storage keys and the admin review notes into
 * the render on every profile view. None of it is used, and none of it should be
 * a stray property away from a client payload.
 */
export const PROFILE_OWNER_USER_SELECT = {
  isPro: true,
  proExpiresAt: true,
  isMobileVerified: true,
  mobile: true,
  email: true,
} as const;

/** Entitlement-only fields — all `isProActive()` needs about the viewer. */
export const VIEWER_PRO_SELECT = {
  isPro: true,
  proExpiresAt: true,
} as const;

/** A Profile row fetched with BROWSE_CARD_SELECT. */
export type BrowseCardRow = Prisma.ProfileGetPayload<{
  select: typeof BROWSE_CARD_SELECT;
}>;

/**
 * Turn fetched Profile rows into presentation-ready cards: resolves the
 * viewer's photo-access state and signs only the viewer-appropriate key per
 * card (ORIGINAL when PUBLIC/APPROVED, else the blurred teaser). Because the
 * caller controls which rows come in, signing scales with what's shown — the
 * recommender hydrates just its top 20, never the whole candidate scan.
 */
export async function hydrateProfileCards(
  profiles: BrowseCardRow[],
  viewerId: string,
  viewerIsAdmin = false,
): Promise<ProfileSummary[]> {
  // Photo-access state only applies to profiles that have a User account.
  // Managed profiles (userId = null) have no ownerId, so they always show as "NONE".
  // Whether the mobile signal is earned right now (one cached read per request).
  const countMobile = await mobileCountsTowardTrust();

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
  //
  // Keys are split into two TTL buckets, because the signed URL is a bearer
  // capability and its lifetime is the revocation window:
  //
  //   ungated — a blurred derivative, or an original the owner marked PUBLIC.
  //             Nothing to revoke, so sign for PUBLIC_URL_TTL and let browsers
  //             and the image optimizer actually reuse the derivative.
  //   gated   — an original unlocked only by this viewer's APPROVED request.
  //             Short SIGNED_URL_TTL, so revoking access takes effect promptly.
  const ungatedKeys: string[] = [];
  const gatedKeys: string[] = [];
  for (const p of profiles) {
    const img = p.images[0];
    if (!img) continue;
    const access = p.userId ? (statusByOwner.get(p.userId) ?? "NONE") : "NONE";
    const isPublic = img.privacy === "PUBLIC";
    if (isPublic) ungatedKeys.push(img.originalKey);
    // Admins review photos, so they bypass the member privacy gate — but the
    // original still goes in the short-TTL bucket, same as an APPROVED grant.
    else if (viewerIsAdmin || access === "APPROVED") gatedKeys.push(img.originalKey);
    else ungatedKeys.push(img.blurredKey);
  }
  const [ungatedSigned, gatedSigned] = await Promise.all([
    signUrls(ungatedKeys, PUBLIC_URL_TTL),
    signUrls(gatedKeys),
  ]);
  const signed = new Map([...ungatedSigned, ...gatedSigned]);

  return profiles.map((p) => {
    // For managed profiles (userId = null) use the Profile.id as the card
    // identifier so they get a unique, stable key in the grid.
    const cardId = p.userId ?? p.id;
    const img = p.images[0];
    const access: PhotoAccessState = p.userId
      ? (statusByOwner.get(p.userId) ?? "NONE")
      : "NONE";
    const revealed =
      !!img && (viewerIsAdmin || img.privacy === "PUBLIC" || access === "APPROVED");
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
      isFeatured: p.isFeatured,
      isPro: p.user?.isPro ?? false,
      managedBy: resolveManagerType(p.referredBy?.accountCategory ?? null),
      primaryImagePrivacy: (img?.privacy as ImagePrivacy) ?? "BLURRED",
      imageUrl: key ? signed.get(key) : undefined,
      photoAccess: access,
      adminView: viewerIsAdmin,
      // Trust signals, scored as a share of the signals that are actually
      // EARNABLE. The mobile component is dropped entirely — numerator AND
      // denominator — while ENABLE_SMS_OTP is off, because then it is set for
      // anyone who typed a plausible number. Leaving it in would hand out 25
      // free points and make the score meaningless to other members. Dividing by
      // the live signal count keeps a fully-verified member at 100 either way.
      trustScore: trustScoreOf([
        p.isVerified,
        ...(countMobile ? [p.user?.isMobileVerified ?? false] : []),
        p.user?.nidVerificationStatus === "APPROVED",
        p.user?.selfieVerificationStatus === "APPROVED",
      ]),
    };
  });
}

/** 0-100 share of the supplied trust signals that are satisfied. */
export function trustScoreOf(signals: boolean[]): number {
  if (signals.length === 0) return 0;
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

/** Cards per page on the browse grid. Divides evenly by 2 and 3 columns. */
export const BROWSE_PAGE_SIZE = 12;

/** One page of the browse feed, plus what the UI needs to render pager links. */
export interface BrowsePage {
  profiles: ProfileSummary[];
  /** Total rows matching the filters, across every page. */
  total: number;
  /** The page actually served (clamped into range). */
  page: number;
  pageCount: number;
  limit: number;
}

/**
 * Build the browse feed's WHERE clause.
 *
 * Extracted so the page query and the COUNT query are provably identical — if
 * they drift, the pager advertises pages that render empty. Every caller must
 * use this rather than assembling its own filter object.
 */
function buildBrowseWhere(
  viewerId: string,
  filters: SearchFilters,
): Prisma.ProfileWhereInput {

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
  // always included in the browse feed for every viewer. Viewer role/category
  // deliberately does NOT gate this arm.
  const where: Prisma.ProfileWhereInput = {
    OR: [{ userId: null }, selfCandidateArm],
  };
  // Scalar equality filters. Each is applied only when provided, so an absent
  // filter never narrows the feed — and none of them touches the candidate-arm
  // OR above, so managed profiles (userId = null) stay reachable.
  if (filters.gender) where.gender = filters.gender;
  if (filters.district) where.district = filters.district;
  if (filters.upazila) where.upazila = filters.upazila;
  if (filters.religion) where.religion = filters.religion;
  if (filters.sect) where.sect = filters.sect;
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

  return where;
}

/**
 * One page of profiles for the browse/search grid (viewer-scoped). Excludes the
 * viewer's own profile, applies the given filters, and includes the viewer's
 * current photo-access state per card. Photos always start blurred in the
 * payload; only the viewer's access state is exposed, not the image keys.
 *
 * PAGINATED because the feed is unbounded: without a `take` this fetched — and
 * signed a URL for — every matching profile in the database on every request,
 * so cost grew linearly with signups. `page` is clamped into range, so a
 * hand-edited ?page=999 lands on the last page instead of rendering blank.
 */
export async function getBrowseProfiles(
  viewerId: string,
  filters: SearchFilters = {},
  viewerRole?: string | null,
  viewerCategory?: string | null,
  options: { page?: number; limit?: number } = {},
): Promise<BrowsePage> {
  const limit = Math.max(1, Math.trunc(options.limit ?? BROWSE_PAGE_SIZE));
  const requestedPage = Math.max(1, Math.trunc(options.page ?? 1));
  const where = buildBrowseWhere(viewerId, filters);

  // Count first: the page number has to be clamped against a real total before
  // we can compute a valid `skip`, otherwise an out-of-range page silently
  // returns nothing.
  const total = await prisma.profile.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, pageCount);

  if (total === 0) {
    return { profiles: [], total, page: 1, pageCount: 1, limit };
  }

  const rows = await prisma.profile.findMany({
    where,
    // Keep featured profiles at the front of the listing while retaining a
    // stable order within each featured/verification group across pages.
    orderBy: [
      { isFeatured: "desc" },
      { isVerified: "desc" },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    skip: (page - 1) * limit,
    take: limit,
    select: BROWSE_CARD_SELECT,
  });

  return {
    profiles: await hydrateProfileCards(rows, viewerId, isAdminRole(viewerRole)),
    total,
    page,
    pageCount,
    limit,
  };
}

/** The storage fields signGallery needs from a ProfileImage row. */
interface GalleryRow {
  id: string;
  privacy: string;
  originalKey: string;
  blurredKey: string;
  moderationStatus: string;
}

/**
 * Sign a profile's gallery for one viewer. Each photo gets the ORIGINAL when
 * it is PUBLIC or `unlocked` (an APPROVED access grant, or an admin), else the
 * pre-blurred derivative — the original key of a gated photo is never signed.
 *
 * TTLs follow hydrateProfileCards: an original unlocked by a grant is a
 * revocable capability (short SIGNED_URL_TTL); public originals and blurred
 * derivatives have nothing to revoke (PUBLIC_URL_TTL).
 */
async function signGallery(
  rows: GalleryRow[],
  unlocked: boolean,
  viewerIsAdmin: boolean,
): Promise<ProfilePhoto[]> {
  const plan = rows.map((img) => {
    const isPublic = img.privacy === "PUBLIC";
    const revealed = isPublic || unlocked;
    return {
      img,
      revealed,
      key: revealed ? img.originalKey : img.blurredKey,
      gated: revealed && !isPublic,
    };
  });
  const [ungated, gated] = await Promise.all([
    signUrls(plan.filter((p) => !p.gated).map((p) => p.key), PUBLIC_URL_TTL),
    signUrls(plan.filter((p) => p.gated).map((p) => p.key)),
  ]);
  return plan.map(({ img, revealed, key, gated: g }) => ({
    id: img.id,
    url: (g ? gated : ungated).get(key),
    privacy: img.privacy as ImagePrivacy,
    revealed,
    moderation: viewerIsAdmin
      ? (img.moderationStatus as ModerationStatus)
      : undefined,
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
  profileId: string,
): Promise<ProfileViewAccess> {
  const unlimited = { allowed: true, unlimited: true, used: 0, limit: FREE_DAILY_LIMIT };
  if (viewerId === profileId) return unlimited;

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true, proExpiresAt: true, role: true },
  });
  // Moderators must be able to open any number of profiles to review them.
  if (isProActive(viewer) || isAdminRole(viewer?.role)) return unlimited;

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
  viewerIsAdmin = false,
): Promise<ProfileDetailView | null> {
  // Look up by userId OR profile.id — managed profiles have userId = null and
  // are identified by their profile.id in the browse feed.
  const profile = await prisma.profile.findFirst({
    where: { OR: [{ userId: profileId }, { id: profileId }] },
    include: {
      user: { select: PROFILE_OWNER_USER_SELECT },
      referredBy: { select: { accountCategory: true } },
      // Pre-moderation: only an APPROVED primary photo is served to members.
      // Admins see the primary photo whatever its moderation state, so they
      // can verify it (a PENDING one is flagged with a link to the queue).
      // The whole gallery (primary first). Upload caps it at MAX_PHOTOS.
      images: {
        where: viewerIsAdmin ? {} : { moderationStatus: "APPROVED" },
        orderBy: PRIMARY_IMAGE_ORDER,
      },
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
  // Admin reviews are not member interest, so they are not logged either.
  if (ownerUserId && viewerId !== ownerUserId && !viewerIsAdmin) {
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
      : await prisma.user.findUnique({
          where: { id: viewerId },
          select: VIEWER_PRO_SELECT,
        })
    : await prisma.user.findUnique({
        where: { id: viewerId },
        select: VIEWER_PRO_SELECT,
      });

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
    isAdmin: viewerIsAdmin,
  };

  const primary = profile.images[0];

  // Admins bypass the member photo-privacy gate: they always get the original.
  // A photo-access grant is per owner, so it unlocks every BLURRED photo.
  const photos = await signGallery(
    profile.images,
    viewerIsAdmin || photoReq?.status === "APPROVED",
    viewerIsAdmin,
  );
  const imageUrl = photos[0]?.url;

  const view: ProfileDetailView = {
    // Use userId when available; fall back to referredById (parent/agency) so
    // social actions are routed to them, finally to profile.id as a last resort.
    id: profile.userId ?? profile.referredById ?? profile.id,
    profileId: profile.id,
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
    isFeatured: profile.isFeatured,
    isPro: isProActive(profileUser),
    managedBy: resolveManagerType(profile.referredBy?.accountCategory ?? null),
    primaryImagePrivacy: (primary?.privacy as ImagePrivacy) ?? "BLURRED",
    imageUrl,
    photos,
    // Admin-only: lets the photo panel flag a photo still awaiting review.
    primaryImageModeration:
      viewerIsAdmin && primary
        ? (primary.moderationStatus as ModerationStatus)
        : undefined,
    details: {
      height: profile.height ?? "",
      weight: profile.weight ?? "",
      childrenStatus: profile.childrenStatus ?? "",
      maritalStatus: profile.maritalStatus ?? "",
      // Structured columns (+ legacy free text) -> the Full Details rows.
      family: buildFamilyBackground(profile),
      educationInstitute: profile.educationInstitute ?? "",
      educationMajor: profile.educationMajor ?? "",
      religion: profile.religion ?? "",
      sect: profile.sect ?? "",
      caste: profile.caste ?? "",
      diet: profile.diet ?? "",
      smokingStatus: profile.smokingStatus ?? "",
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

/**
 * Profile Detail view for an unauthenticated "Explore as Guest" visitor.
 *
 * Deliberately NOT a thin wrapper around `getProfileForViewer`: that function
 * upserts a `ProfileViewLog` row keyed by the caller's viewerId, and that
 * column has a foreign-key constraint to a real `User` — there is no viewer
 * row to attribute a guest's view to. So this reads the same profile fields
 * but performs no write, and always returns the "brand-new free viewer"
 * shape (locked photo, no interest, not matched, no daily-view counter) — a
 * guest never has a photo-access request, a sent interest, or a match to look
 * up in the first place.
 */
export async function getGuestProfilePreview(
  profileId: string,
): Promise<ProfileDetailView | null> {
  const profile = await prisma.profile.findFirst({
    where: { OR: [{ userId: profileId }, { id: profileId }] },
    include: {
      user: { select: PROFILE_OWNER_USER_SELECT },
      referredBy: { select: { accountCategory: true } },
      images: {
        where: { moderationStatus: "APPROVED" },
        orderBy: PRIMARY_IMAGE_ORDER,
      },
    },
  });
  if (!profile) return null;

  const profileUser = profile.user;
  const primary = profile.images[0];
  // No photoAccessRequest exists for a guest, so a photo is only ever visible
  // when the owner made it PUBLIC — never gated-and-approved.
  const photos = await signGallery(profile.images, false, false);
  const imageUrl = photos[0]?.url;

  return {
    id: profile.userId ?? profile.referredById ?? profile.id,
    profileId: profile.id,
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
    isFeatured: profile.isFeatured,
    isPro: isProActive(profileUser),
    managedBy: resolveManagerType(profile.referredBy?.accountCategory ?? null),
    primaryImagePrivacy: (primary?.privacy as ImagePrivacy) ?? "BLURRED",
    imageUrl,
    photos,
    details: {
      height: profile.height ?? "",
      weight: profile.weight ?? "",
      childrenStatus: profile.childrenStatus ?? "",
      maritalStatus: profile.maritalStatus ?? "",
      // Structured columns (+ legacy free text) -> the Full Details rows.
      family: buildFamilyBackground(profile),
      educationInstitute: profile.educationInstitute ?? "",
      educationMajor: profile.educationMajor ?? "",
      religion: profile.religion ?? "",
      sect: profile.sect ?? "",
      caste: profile.caste ?? "",
      diet: profile.diet ?? "",
      smokingStatus: profile.smokingStatus ?? "",
    },
    verifications: {
      mobile: profileUser?.isMobileVerified ?? false,
      email: false,
      photo: profile.isVerified,
      nid: false,
    },
    // Guest baseline: nothing requested, nothing sent, no match — identical to
    // what a fresh authenticated free member sees on someone new.
    viewer: {
      photoAccess: "NONE",
      interest: "NONE",
      isPro: false,
      isMatched: false,
      isAdmin: false,
    },
    // Contact is never handed to a guest (it otherwise requires a mutual
    // ACCEPTED interest, which a signed-out visitor can never have).
    maskedContact: undefined,
  };
}
