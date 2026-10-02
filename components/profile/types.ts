/**
 * UI-side view model for the Profile Detail page.
 *
 * NOTE: These string-literal unions intentionally MIRROR the Prisma enums in
 * prisma/schema.prisma. We do NOT import from "@prisma/client" here, because
 * that package bundles the query engine and must never reach a client bundle.
 * Keep these in sync with the schema by hand.
 */

// Mirrors schema `ImagePrivacy`
export type ImagePrivacy = "BLURRED" | "PUBLIC";

// Mirrors schema `ModerationStatus`
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

// Mirrors schema `ReportStatus`
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

// Mirrors schema `ReportReason`
export type ReportReason =
  | "INAPPROPRIATE_PHOTO"
  | "FAKE_PROFILE"
  | "HARASSMENT"
  | "SPAM"
  | "OTHER";

// Mirrors schema `PhotoAccessStatus`, plus a "NONE" UI state (not yet requested)
export type PhotoAccessState =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "REVOKED";

// Mirrors schema `InterestStatus`, plus a "NONE" UI state (not yet sent)
export type InterestState = "NONE" | "SENT" | "ACCEPTED" | "DECLINED";

/** What the current viewer is allowed to see / has done with this profile. */
export interface ViewerState {
  photoAccess: PhotoAccessState;
  interest: InterestState;
  /** Whether the current viewer has a Pro (paid) subscription. */
  isPro: boolean;
  /** Mutual ACCEPTED interest (either direction) — unlocks in-app messaging. */
  isMatched: boolean;
  /**
   * ADMIN / SUPER_ADMIN viewer. Bypasses the member photo-privacy gate (the
   * server already signed the original) and hides the photo-request flow.
   */
  isAdmin: boolean;
}

/**
 * Verification statuses shown in the "Trust & Verifications" card.
 * Fields without a real API backend yet are kept as mock booleans until the
 * third-party verification providers are wired up.
 */
export interface ProfileVerifications {
  /** Real — backed by MobileOtp flow + User.isMobileVerified in the DB. */
  mobile: boolean;
  /** Mock — email OTP not yet implemented. */
  email: boolean;
  /** Mock — selfie/liveness check not yet implemented; proxied from isVerified. */
  photo: boolean;
  /** Mock — NID/passport API not yet implemented. */
  nid: boolean;
}

/**
 * Family background, split into the rows the Full Details modal renders.
 *
 * Every field is optional because the DB holds a single free-text column that
 * is parsed into these (see `lib/data/familyDetails.ts`): a value is present
 * only when it could be identified. `note` carries whatever did not classify,
 * and `raw` is the untouched original (used for the completion score).
 */
export interface FamilyBackground {
  /** Joint / nuclear, as written by the member. */
  status?: string;
  fatherProfession?: string;
  motherProfession?: string;
  siblings?: string;
  /** Religious / cultural values the member described. */
  values?: string;
  /** Unclassified remainder of the free-text blurb. */
  note?: string;
  /** The original stored string, verbatim. */
  raw: string;
}

/** Extended attributes shown in the "View Full Details" modal. */
export interface ProfileFullDetails {
  height: string;
  weight: string;
  childrenStatus: string;
  /** Duplicated from the key-facts card so the modal reads standalone. */
  maritalStatus: string;
  family: FamilyBackground;
  /** Canonical English values — localize at render time via `localize()`. */
  religion: string;
  sect: string;
  caste: string;
  diet: string;
  smokingStatus: string;
}

/**
 * The current user's own profile, shaped for an edit form. All values are
 * strings (empty when unset) so inputs are controlled-friendly; dateOfBirth is
 * "yyyy-mm-dd" for <input type="date">.
 */
export interface EditableProfile {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  district: string;
  upazila: string;
  religion: string;
  sect: string;
  caste: string;
  profession: string;
  education: string;
  maritalStatus: string;
  height: string;
  weight: string;
  childrenStatus: string;
  familyDetails: string;
  diet: string;
  smokingStatus: string;
  bio: string;
  nameHidden: boolean;
}

/**
 * A profile's partner criteria, shaped for the preferences form. Ranges are
 * strings so number/select inputs stay controlled-friendly ("" = unset); the
 * multi-value dimensions are canonical English values.
 */
export interface EditablePartnerPreference {
  minAge: string;
  maxAge: string;
  minHeight: string;
  maxHeight: string;
  religions: string[];
  sects: string[];
  districts: string[];
  professions: string[];
  educations: string[];
  maritalStatuses: string[];
}

/** Lightweight, presentation-ready profile for the browse/listing grid. */
export interface ProfileSummary {
  id: string;
  /** Already display-resolved: real name, or a placeholder if nameHidden. */
  displayName: string;
  nameHidden: boolean;
  gender: string;
  age: number;
  district: string;
  upazila: string;
  isVerified: boolean;
  /** Owner has a Pro membership -> shows the golden VIP badge on the card. */
  isPro: boolean;
  /**
   * Who manages this profile: "GUARDIAN" = parent, "MEDIA" = agency, null = self.
   * Drives the management badge on the browse card.
   */
  managedBy: "GUARDIAN" | "MEDIA" | null;
  primaryImagePrivacy: ImagePrivacy;
  /**
   * Signed URL for the primary photo, viewer-appropriate: the ORIGINAL when the
   * viewer is allowed to see it (PUBLIC photo or APPROVED access), otherwise the
   * pre-blurred teaser. Absent when the profile has no photo.
   */
  imageUrl?: string;
  /** The current viewer's photo-access state for this profile. */
  photoAccess: PhotoAccessState;
  /** Viewer is an admin: the photo is the unblurred original, no request flow. */
  adminView?: boolean;
  /**
   * 0–100 trust score derived from completed verifications (mobile, email,
   * photo, NID). Drives the mini progress bar on the browse card.
   */
  trustScore: number;
}

/** One gallery photo, already signed for the current viewer. */
export interface ProfilePhoto {
  id: string;
  /** Original when `revealed`, else the pre-blurred derivative. */
  url?: string;
  privacy: ImagePrivacy;
  /** Viewer may see this photo clearly (PUBLIC, APPROVED access, or admin). */
  revealed: boolean;
  /** Moderation state — set only for admin viewers. */
  moderation?: ModerationStatus;
}

/** Composed, presentation-ready profile for the detail page. */
export interface ProfileDetailView {
  id: string;
  /** Already display-resolved: real name, or a placeholder if nameHidden. */
  displayName: string;
  nameHidden: boolean;
  gender: string;
  age: number;
  district: string;
  upazila: string;
  profession: string;
  education: string;
  maritalStatus: string;
  bio: string;
  completionScore: number;
  isVerified: boolean;
  /** Owner has a Pro membership -> shows the golden VIP badge. */
  isPro: boolean;
  /** Who manages this profile: "GUARDIAN" = parent, "MEDIA" = agency, null = self. */
  managedBy: "GUARDIAN" | "MEDIA" | null;
  /** Display name of the referring MEDIA partner, if any. */
  referredByMedia?: string;
  primaryImagePrivacy: ImagePrivacy;
  /**
   * Signed URL for the primary photo, viewer-appropriate (original when the
   * viewer may see it, otherwise the pre-blurred teaser). Absent when no photo.
   */
  imageUrl?: string;
  /**
   * Every photo the viewer may see, primary first: approved photos for
   * members/guests, all photos (any moderation state) for admins.
   */
  photos: ProfilePhoto[];
  /** Moderation state of the primary photo — set only for admin viewers. */
  primaryImageModeration?: ModerationStatus;
  details: ProfileFullDetails;
  verifications: ProfileVerifications;
  viewer: ViewerState;
  /**
   * Pre-masked contact hints ("018****3456" / "a***@gmail.com"), shown as a
   * trust signal. Masked SERVER-SIDE — raw phone/email are never serialized
   * to the client regardless of match state (connect happens in-app).
   * Absent for managed profiles with no User account.
   */
  maskedContact?: { phone?: string; email?: string };
}
