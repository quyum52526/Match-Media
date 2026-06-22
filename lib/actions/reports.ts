"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import type { ReportReason } from "@/components/profile/types";

const PROFILE = "/[locale]/profiles/[id]";

const REASONS: ReportReason[] = [
  "INAPPROPRIATE_PHOTO",
  "FAKE_PROFILE",
  "HARASSMENT",
  "SPAM",
  "OTHER",
];

export type ReportResult = { ok: true } | { ok: false; error: string };
const ok: ReportResult = { ok: true };
const err = (error: string): ReportResult => ({ ok: false, error });

/**
 * A user reports another user's profile (optionally pinning a specific photo).
 * Guards: must be signed in, can't report yourself, reason must be valid. A
 * reporter can have only one OPEN report per target at a time (dedupe) — a
 * repeat just succeeds quietly so the UI stays simple.
 */
export async function reportProfile(
  reportedUserId: string,
  reason: string,
  note?: string,
  imageId?: string,
): Promise<ReportResult> {
  const reporterId = await getViewerId();
  if (!reporterId) return err("UNAUTH");
  if (!reportedUserId || reportedUserId === reporterId) return err("SELF");
  if (!REASONS.includes(reason as ReportReason)) return err("REASON");

  const existing = await prisma.report.findFirst({
    where: { reporterId, reportedUserId, status: "OPEN" },
    select: { id: true },
  });
  if (existing) return ok; // already reported; don't pile on duplicates

  await prisma.report.create({
    data: {
      reporterId,
      reportedUserId,
      reason: reason as ReportReason,
      note: note?.trim() || null,
      imageId: imageId || null,
    },
  });

  revalidatePath(PROFILE, "page");
  return ok;
}
