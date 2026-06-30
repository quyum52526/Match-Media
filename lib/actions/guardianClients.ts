"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";

export interface CreateChildInput {
  fullName: string;
  gender: string;
  dateOfBirth: string; // "yyyy-mm-dd"
  district?: string;
  profession?: string;
  education?: string;
}

export type CreateChildResult =
  | { ok: true; profileId: string }
  | { error: string };

export async function createGuardianChildProfile(
  input: CreateChildInput,
): Promise<CreateChildResult> {
  const guardianUserId = await requireViewerId("/login");

  const user = await prisma.user.findUnique({
    where: { id: guardianUserId },
    select: { accountCategory: true },
  });
  if (user?.accountCategory !== "PARENTS") {
    return { error: "Only Guardian (Parent) accounts can create child profiles." };
  }

  const MAX_CHILDREN = 3;
  const existing = await prisma.profile.count({
    where: { referredById: guardianUserId, managedByAgency: true },
  });
  if (existing >= MAX_CHILDREN) {
    return { error: `You can only manage up to ${MAX_CHILDREN} child profiles.` };
  }

  if (!input.fullName.trim()) return { error: "Full name is required." };
  if (!input.gender) return { error: "Gender is required." };
  if (!input.dateOfBirth) return { error: "Date of birth is required." };

  const dob = new Date(input.dateOfBirth);
  if (isNaN(dob.getTime())) return { error: "Invalid date of birth." };

  const profile = await prisma.profile.create({
    data: {
      // userId is null — the child has no login account of their own.
      fullName: input.fullName.trim(),
      gender: input.gender,
      dateOfBirth: dob,
      district: input.district || null,
      profession: input.profession || null,
      education: input.education || null,
      managedByAgency: true,   // reuse the existing managed-profile flag
      referredById: guardianUserId,
      completionScore: 25,
    },
  });

  revalidatePath("/profile/edit");
  return { ok: true, profileId: profile.id };
}
