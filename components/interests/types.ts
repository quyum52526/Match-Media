import type { RequestPerson } from "@/components/requests/types";

/**
 * UI-side view model for the received-interests inbox.
 * Subset of schema `InterestStatus` that appears here (no "NONE").
 */
export type InterestInboxStatus = "SENT" | "ACCEPTED" | "DECLINED";

/** An interest the current user RECEIVED (they are the receiver). */
export interface ReceivedInterest {
  id: string;
  /** The person who expressed interest. */
  person: RequestPerson;
  status: InterestInboxStatus;
  /** Optional introductory note the sender attached (max 200 chars). */
  note: string | null;
  /** ISO timestamp. */
  createdAt: string;
}
