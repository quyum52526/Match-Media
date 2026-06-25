/**
 * Presentation-ready view models for the admin area. Kept separate from the
 * server-only data loader (lib/data/admin.ts) so client components can import
 * the types without pulling server code.
 */
import type { ReportReason, ReportStatus } from "@/components/profile/types";

export interface AdminStats {
  pendingPhotos: number;
  openReports: number;
  unverifiedProfiles: number;
}

/** A photo awaiting moderation (admin sees the clear original). */
export interface PendingPhoto {
  id: string;
  url: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  uploadedAt: string;
}

/** An open report shown in the moderation queue. */
export interface AdminReport {
  id: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  reporterEmail: string;
  reportedUserId: string;
  reportedName: string;
  reportedEmail: string;
  /** Signed URL for the specific reported photo, if any. */
  imageUrl?: string;
}

/** A profile row for the verification list. */
export interface VerificationProfile {
  userId: string;
  name: string;
  email: string;
  district: string;
  age: number;
  isVerified: boolean;
}
