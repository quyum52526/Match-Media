import "server-only";
import { prisma } from "@/lib/prisma";
import { personProfileSelect, toRequestPerson } from "./person";
import type {
  ReceivedInterest,
  InterestInboxStatus,
} from "@/components/interests/types";

function toInterestStatus(status: string): InterestInboxStatus {
  if (status === "ACCEPTED") return "ACCEPTED";
  if (status === "DECLINED") return "DECLINED";
  return "SENT";
}

/** Interests the viewer RECEIVED (they are the receiver) — newest first. */
export async function getReceivedInterests(
  viewerId: string,
): Promise<ReceivedInterest[]> {
  const rows = await prisma.interest.findMany({
    where: { receiverId: viewerId },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, profile: { select: personProfileSelect } } },
    },
  });

  return rows.flatMap((r) => {
    const person = toRequestPerson(r.sender);
    if (!person) return [];
    return [
      {
        id: r.id,
        person,
        status: toInterestStatus(r.status),
        createdAt: r.createdAt.toISOString(),
      },
    ];
  });
}
