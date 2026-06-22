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
}

export interface ProfileContact {
  mobile: string;
  email: string;
}

/** Extended attributes shown in the "View Full Details" modal. */
export interface ProfileFullDetails {
  height: string;
  weight: string;
  childrenStatus: string;
  family: string;
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
  profession: string;
  education: string;
  maritalStatus: string;
  height: string;
  weight: string;
  childrenStatus: string;
  familyDetails: string;
  bio: string;
  nameHidden: boolean;
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
  primaryImagePrivacy: ImagePrivacy;
  /**
   * Signed URL for the primary photo, viewer-appropriate: the ORIGINAL when the
   * viewer is allowed to see it (PUBLIC photo or APPROVED access), otherwise the
   * pre-blurred teaser. Absent when the profile has no photo.
   */
  imageUrl?: string;
  /** The current viewer's photo-access state for this profile. */
  photoAccess: PhotoAccessState;
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
  /** Display name of the referring MEDIA partner, if any. */
  referredByMedia?: string;
  primaryImagePrivacy: ImagePrivacy;
  /**
   * Signed URL for the primary photo, viewer-appropriate (original when the
   * viewer may see it, otherwise the pre-blurred teaser). Absent when no photo.
   */
  imageUrl?: string;
  details: ProfileFullDetails;
  viewer: ViewerState;
  /** Revealed only to Pro viewers. */
  contact?: ProfileContact;
}
