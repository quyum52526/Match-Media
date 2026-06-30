"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";

/** Agent acknowledges a PENDING assignment → IN_PROGRESS. */
export async function startAssignment(assignmentId: string) {
  const agentId = await requireViewerId("/login");

  await prisma.verificationAssignment.updateMany({
    where: { id: assignmentId, agentId, status: "PENDING" },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  revalidatePath("/profile/edit");
}

/** Agent submits completion report → SUBMITTED (awaiting admin review). */
export async function submitAssignment(assignmentId: string, note: string) {
  const agentId = await requireViewerId("/login");

  if (!note.trim()) return { error: "Report note is required." };

  await prisma.verificationAssignment.updateMany({
    where: { id: assignmentId, agentId, status: "IN_PROGRESS" },
    data: { status: "SUBMITTED", agentNote: note.trim(), submittedAt: new Date() },
  });

  revalidatePath("/profile/edit");
  return { ok: true };
}
