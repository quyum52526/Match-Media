/**
 * UI-side view models for the photo-access request inbox.
 * Mirrors the schema `PhotoAccessRequest` (viewer/owner + status), reshaped
 * per perspective. We keep these as string-literal types (no @prisma/client
 * import in the client bundle), in sync with schema `PhotoAccessStatus`.
 */

// Subset of `PhotoAccessStatus` that appears in the inbox.
export type RequestStatus = "PENDING" | "APPROVED" | "DENIED";

/** Minimal person info shown for each request (photo stays blurred). */
export interface RequestPerson {
  id: string;
  /** Already display-resolved: real name, or a placeholder if nameHidden. */
  displayName: string;
  nameHidden: boolean;
  age: number;
  district: string;
  upazila: string;
  isVerified: boolean;
}

/** A request the current user RECEIVED (they are the owner). */
export interface ReceivedRequest {
  id: string;
  /** The viewer who asked to see the owner's photo. */
  person: RequestPerson;
  status: RequestStatus;
  /** ISO timestamp. */
  requestedAt: string;
}

/** A request the current user SENT (they are the viewer). */
export interface SentRequest {
  id: string;
  /** The owner whose photo was requested. */
  person: RequestPerson;
  status: RequestStatus;
  /** ISO timestamp. */
  requestedAt: string;
}
