import "server-only";
import { prisma } from "@/lib/prisma";
import { personProfileSelect, toRequestPerson } from "./person";
import type {
  ReceivedRequest,
  SentRequest,
  RequestStatus,
} from "@/components/requests/types";

// The inbox only surfaces PENDING/APPROVED/DENIED; map REVOKED -> DENIED.
function toRequestStatus(status: string): RequestStatus {
  if (status === "APPROVED") return "APPROVED";
  if (status === "PENDING") return "PENDING";
  return "DENIED";
}

/** Requests the viewer RECEIVED (they are the owner) — newest first. */
export async function getReceivedRequests(
  viewerId: string,
): Promise<ReceivedRequest[]> {
  const rows = await prisma.photoAccessRequest.findMany({
    where: { ownerId: viewerId },
    orderBy: { requestedAt: "desc" },
    include: {
      viewer: { select: { id: true, profile: { select: personProfileSelect } } },
    },
  });

  return rows.flatMap((r) => {
    const person = toRequestPerson(r.viewer);
    if (!person) return [];
    return [
      {
        id: r.id,
        person,
        status: toRequestStatus(r.status),
        requestedAt: r.requestedAt.toISOString(),
      },
    ];
  });
}

/** Requests the viewer SENT (they are the viewer) — newest first. */
export async function getSentRequests(
  viewerId: string,
): Promise<SentRequest[]> {
  const rows = await prisma.photoAccessRequest.findMany({
    where: { viewerId },
    orderBy: { requestedAt: "desc" },
    include: {
      owner: { select: { id: true, profile: { select: personProfileSelect } } },
    },
  });

  return rows.flatMap((r) => {
    const person = toRequestPerson(r.owner);
    if (!person) return [];
    return [
      {
        id: r.id,
        person,
        status: toRequestStatus(r.status),
        requestedAt: r.requestedAt.toISOString(),
      },
    ];
  });
}
