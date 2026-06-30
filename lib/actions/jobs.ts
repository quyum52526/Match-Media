"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";

// ── Apply to a job ────────────────────────────────────────────────────────────

export type ApplyResult =
  | { ok: true }
  | { ok: false; error: "UNAUTHORIZED" | "NOT_AGENT" | "ALREADY_APPLIED" | "JOB_CLOSED" | "INVALID" };

export async function applyToJob(
  jobId: string,
  bidAmount: number,
  estimatedDeliveryDays: number,
  note: string,
): Promise<ApplyResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false, error: "UNAUTHORIZED" };

  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { role: true },
  });
  if (user?.role !== "AGENT" && user?.role !== "ADMIN") {
    return { ok: false, error: "NOT_AGENT" };
  }

  if (!bidAmount || bidAmount <= 0 || !estimatedDeliveryDays || estimatedDeliveryDays <= 0) {
    return { ok: false, error: "INVALID" };
  }

  const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "OPEN") return { ok: false, error: "JOB_CLOSED" };

  try {
    await prisma.jobApplication.create({
      data: {
        jobPostId: jobId,
        agentId: viewerId,
        bidAmount: Math.round(bidAmount * 100), // convert ৳ → poisha
        estimatedDeliveryDays,
        note: note.trim() || null,
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { ok: false, error: "ALREADY_APPLIED" };
    }
    throw e;
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ── Request verification (any authenticated user) ────────────────────────────

export type RequestVerificationResult =
  | { ok: true; jobId: string }
  | { ok: false; error: "UNAUTHORIZED" | "INVALID" };

export async function requestVerification(
  targetDistrict: string,
  details: string,
): Promise<RequestVerificationResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false, error: "UNAUTHORIZED" };

  const district = targetDistrict.trim();
  const description = details.trim();
  if (!district || !description) return { ok: false, error: "INVALID" };

  const job = await prisma.jobPost.create({
    data: {
      title: `Verification Request — ${district}`,
      description,
      targetDistrict: district,
      budgetAmount: 50000, // ৳500 default; agents bid their own price
      postedById: viewerId,
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true, jobId: job.id };
}

// ── Post a new job (ADMIN only) ───────────────────────────────────────────────

export type PostJobResult =
  | { ok: true; jobId: string }
  | { ok: false; error: "UNAUTHORIZED" | "INVALID" };

export async function postJob(formData: FormData): Promise<PostJobResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false, error: "UNAUTHORIZED" };

  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return { ok: false, error: "UNAUTHORIZED" };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetDistrict = String(formData.get("targetDistrict") ?? "").trim();
  const budgetBdt = Number(formData.get("budgetAmount"));

  if (!title || !description || !targetDistrict || !budgetBdt || budgetBdt <= 0) {
    return { ok: false, error: "INVALID" };
  }

  const job = await prisma.jobPost.create({
    data: {
      title,
      description,
      targetDistrict,
      budgetAmount: Math.round(budgetBdt * 100), // ৳ → poisha
      postedById: viewerId,
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true, jobId: job.id };
}

// ── Accept / Reject an application (job poster / ADMIN) ──────────────────────

export type ReviewApplicationResult =
  | { ok: true }
  | { ok: false; error: "UNAUTHORIZED" | "NOT_FOUND" };

export async function reviewApplication(
  applicationId: string,
  decision: "ACCEPTED" | "REJECTED",
): Promise<ReviewApplicationResult> {
  const viewerId = await getViewerId();
  if (!viewerId) return { ok: false, error: "UNAUTHORIZED" };

  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { jobPost: { select: { postedById: true } } },
  });
  if (!app) return { ok: false, error: "NOT_FOUND" };

  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { role: true },
  });
  const isOwner = app.jobPost.postedById === viewerId;
  const isAdmin = user?.role === "ADMIN";
  if (!isOwner && !isAdmin) return { ok: false, error: "UNAUTHORIZED" };

  await prisma.$transaction([
    prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: decision },
    }),
    // If accepting, mark the job as ASSIGNED
    ...(decision === "ACCEPTED"
      ? [
          prisma.jobPost.update({
            where: { id: app.jobPostId },
            data: { status: "ASSIGNED" },
          }),
        ]
      : []),
  ]);

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true };
}
