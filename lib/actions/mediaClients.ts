"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";

export interface CreateClientInput {
  fullName: string;
  gender: string;
  dateOfBirth: string; // "yyyy-mm-dd"
  district?: string;
  profession?: string;
  education?: string;
}

export type CreateClientResult =
  | { ok: true; profileId: string }
  | { error: string };

export async function createAgencyClientProfile(
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const agencyUserId = await requireViewerId("/login");

  // Verify the caller is a MEDIA agency.
  const agent = await prisma.user.findUnique({
    where: { id: agencyUserId },
    select: { accountCategory: true },
  });
  if (agent?.accountCategory !== "MEDIA") {
    return { error: "Only MEDIA agency accounts can create client profiles." };
  }

  if (!input.fullName.trim()) return { error: "Full name is required." };
  if (!input.gender) return { error: "Gender is required." };
  if (!input.dateOfBirth) return { error: "Date of birth is required." };

  const dob = new Date(input.dateOfBirth);
  if (isNaN(dob.getTime())) return { error: "Invalid date of birth." };

  const profile = await prisma.profile.create({
    data: {
      // userId is intentionally null — this client has no login account yet.
      fullName: input.fullName.trim(),
      gender: input.gender,
      dateOfBirth: dob,
      district: input.district || null,
      profession: input.profession || null,
      education: input.education || null,
      managedByAgency: true,
      referredById: agencyUserId,
      // completionScore: a freshly-created client profile with name+gender+DOB
      // starts at a higher baseline than the default 10.
      completionScore: 25,
    },
  });

  revalidatePath("/profile/edit");
  return { ok: true, profileId: profile.id };
}

export interface UpdateClientInput extends CreateClientInput {
  profileId: string;
  maritalStatus?: string;
  bio?: string;
}

export type UpdateClientResult = { ok: true } | { error: string };

export async function updateAgencyClientProfile(
  input: UpdateClientInput,
): Promise<UpdateClientResult> {
  const agencyUserId = await requireViewerId("/login");

  // Confirm this profile belongs to the caller's agency.
  const profile = await prisma.profile.findUnique({
    where: { id: input.profileId },
    select: { referredById: true, managedByAgency: true },
  });
  if (!profile?.managedByAgency || profile.referredById !== agencyUserId) {
    return { error: "Profile not found or access denied." };
  }

  if (!input.fullName.trim()) return { error: "Full name is required." };
  const dob = new Date(input.dateOfBirth);
  if (isNaN(dob.getTime())) return { error: "Invalid date of birth." };

  await prisma.profile.update({
    where: { id: input.profileId },
    data: {
      fullName: input.fullName.trim(),
      gender: input.gender,
      dateOfBirth: dob,
      district: input.district || null,
      profession: input.profession || null,
      education: input.education || null,
      maritalStatus: input.maritalStatus || null,
      bio: input.bio || null,
    },
  });

  revalidatePath("/profile/edit");
  return { ok: true };
}
