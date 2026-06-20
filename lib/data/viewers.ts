import "server-only";
import { prisma } from "@/lib/prisma";
import { personProfileSelect, toRequestPerson } from "./person";
import type { RequestPerson } from "@/components/requests/types";

/** Delayed-reveal window: a viewer's identity unlocks 24h after they first view. */
export const REVEAL_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * One person who viewed the current user's profile. While `locked` (within the
 * 24h reveal window) NO identifying data is included — `person` is null and not
 * even the viewer's id is sent, so a locked card cannot be de-anonymized from
 * the client. Identity appears only once the entry has unlocked.
 */
export interface ViewerEntry {
  locked: boolean;
  /** ISO timestamp of their most recent view. */
  viewedAt: string;
  /** ISO timestamp when a locked entry unlocks; null once revealed. */
  revealAt: string | null;
  /** Identity — present ONLY when revealed; withheld (null) while locked. */
  person: RequestPerson | null;
}

export interface ProfileViewers {
  /** Distinct viewers, most-recent first (capped by `limit` when given). */
  viewers: ViewerEntry[];
  /** Total distinct viewers all-time (independent of `limit`). */
  total: number;
  /**
   * Whether the 24h delayed-reveal gate applies to this owner. Female users
   * see every viewer immediately (free perk); everyone else is gated. Drives
   * the UI's "revealed after 24h" note.
   */
  gated: boolean;
}

/**
 * Who recently viewed the current user's profile, newest first, one entry per
 * viewer. Gender-based gating: female owners see all viewers immediately, while
 * other owners only see a viewer's identity 24h after that viewer's FIRST view
 * (so a revealed viewer stays revealed even if they look again). `total` is the
 * exact distinct-viewer count regardless of `limit`.
 */
export async function getProfileViewers(
  viewerId: string,
  limit?: number,
): Promise<ProfileViewers> {
  const where = { viewedProfile: { userId: viewerId } };

  const [owner, groups] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: viewerId },
      select: { gender: true },
    }),
    // One group per viewer: first view (gates the reveal) + latest view (display).
    prisma.profileViewLog.groupBy({
      by: ["viewerId"],
      where,
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    }),
  ]);

  // Female owners get the feature fully unlocked; others are time-gated.
  const gated = owner?.gender !== "Female";

  const total = groups.length;
  const slice = limit ? groups.slice(0, limit) : groups;
  const now = Date.now();

  const firstViewMs = (g: (typeof slice)[number]) =>
    g._min.createdAt?.getTime() ?? now;
  const isRevealed = (g: (typeof slice)[number]) =>
    !gated || now - firstViewMs(g) >= REVEAL_DELAY_MS;

  // Resolve identities ONLY for revealed viewers — locked ones are never fetched.
  const revealedIds = slice.filter(isRevealed).map((g) => g.viewerId);
  const personById = new Map<string, RequestPerson>();
  if (revealedIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: revealedIds } },
      select: { id: true, profile: { select: personProfileSelect } },
    });
    for (const u of users) {
      const person = toRequestPerson(u);
      if (person) personById.set(u.id, person);
    }
  }

  const viewers: ViewerEntry[] = [];
  for (const g of slice) {
    const latest = g._max.createdAt ?? new Date(firstViewMs(g));
    if (isRevealed(g)) {
      const person = personById.get(g.viewerId);
      if (!person) continue; // revealed but no profile yet — skip
      viewers.push({
        locked: false,
        viewedAt: latest.toISOString(),
        revealAt: null,
        person,
      });
    } else {
      viewers.push({
        locked: true,
        viewedAt: latest.toISOString(),
        revealAt: new Date(firstViewMs(g) + REVEAL_DELAY_MS).toISOString(),
        person: null,
      });
    }
  }

  return { viewers, total, gated };
}
