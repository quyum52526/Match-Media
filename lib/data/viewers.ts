import "server-only";
import { prisma } from "@/lib/prisma";
import { personProfileSelect, toRequestPerson } from "./person";
import type { RequestPerson } from "@/components/requests/types";

/** One person who viewed the current user's profile. */
export interface ViewerEntry {
  person: RequestPerson;
  /** ISO date of their most recent view. */
  viewedAt: string;
}

export interface ProfileViewers {
  /** Distinct viewers, most-recent first (capped by `limit` when given). */
  viewers: ViewerEntry[];
  /** Total distinct viewers all-time (independent of `limit`). */
  total: number;
}

// How many recent log rows to scan when collapsing to distinct viewers. Each
// viewer/day is one row, so this comfortably covers recent activity.
const SCAN_WINDOW = 300;

/**
 * Who recently viewed the current user's profile. Collapses the daily-unique
 * view log to one entry per viewer (their latest view), newest first. `total`
 * is the exact distinct-viewer count regardless of `limit`.
 */
export async function getProfileViewers(
  viewerId: string,
  limit?: number,
): Promise<ProfileViewers> {
  const where = { viewedProfile: { userId: viewerId } };

  const [rows, grouped] = await Promise.all([
    prisma.profileViewLog.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: SCAN_WINDOW,
      include: {
        viewer: {
          select: { id: true, profile: { select: personProfileSelect } },
        },
      },
    }),
    prisma.profileViewLog.groupBy({ by: ["viewerId"], where }),
  ]);

  const seen = new Set<string>();
  const viewers: ViewerEntry[] = [];
  for (const row of rows) {
    if (seen.has(row.viewerId)) continue;
    seen.add(row.viewerId);
    const person = toRequestPerson(row.viewer);
    if (!person) continue; // viewer has no profile yet
    viewers.push({ person, viewedAt: row.date.toISOString() });
  }

  return {
    viewers: limit ? viewers.slice(0, limit) : viewers,
    total: grouped.length,
  };
}
