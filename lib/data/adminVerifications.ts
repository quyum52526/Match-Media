import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/storage/supabase";

const VERIFY_BUCKET = "verification-docs";
const URL_TTL = 3600; // 1 hour

async function signVerifyKey(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(VERIFY_BUCKET)
      .createSignedUrl(key, URL_TTL);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pending NID verifications
// ---------------------------------------------------------------------------

export interface PendingNid {
  userId: string;
  email: string;
  fullName: string | null;
  nidFrontUrl: string | null;
  nidBackUrl: string | null;
  submittedAt: Date;
}

export async function getPendingNids(): Promise<PendingNid[]> {
  const users = await prisma.user.findMany({
    where: { nidVerificationStatus: "PENDING" },
    select: {
      id: true,
      email: true,
      nidFrontKey: true,
      nidBackKey: true,
      createdAt: true,
      profile: { select: { fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    users.map(async (u) => ({
      userId: u.id,
      email: u.email,
      fullName: u.profile?.fullName ?? null,
      nidFrontUrl: await signVerifyKey(u.nidFrontKey),
      nidBackUrl: await signVerifyKey(u.nidBackKey),
      submittedAt: u.createdAt,
    })),
  );
}

// ---------------------------------------------------------------------------
// Pending selfie verifications
// ---------------------------------------------------------------------------

export interface PendingSelfie {
  userId: string;
  email: string;
  fullName: string | null;
  selfieUrl: string | null;
  submittedAt: Date;
}

export async function getPendingSelfies(): Promise<PendingSelfie[]> {
  const users = await prisma.user.findMany({
    where: { selfieVerificationStatus: "PENDING" },
    select: {
      id: true,
      email: true,
      selfieKey: true,
      createdAt: true,
      profile: { select: { fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    users.map(async (u) => ({
      userId: u.id,
      email: u.email,
      fullName: u.profile?.fullName ?? null,
      selfieUrl: await signVerifyKey(u.selfieKey),
      submittedAt: u.createdAt,
    })),
  );
}

// ---------------------------------------------------------------------------
// Pending agency verifications
// ---------------------------------------------------------------------------

export interface PendingAgency {
  userId: string;
  email: string;
  agencyName: string | null;
  contactPerson: string | null;
  tradeLicenseUrl: string | null;
  submittedAt: Date;
}

export async function getPendingAgencies(): Promise<PendingAgency[]> {
  const users = await prisma.user.findMany({
    where: { agencyVerificationStatus: "PENDING_APPROVAL" },
    select: {
      id: true,
      email: true,
      agencyName: true,
      contactPerson: true,
      tradeLicenseUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // tradeLicenseUrl on User is stored as a storage key in the profile-photos bucket
  // (legacy: agency uploads used the same bucket). Sign via the main bucket.
  return Promise.all(
    users.map(async (u) => ({
      userId: u.id,
      email: u.email,
      agencyName: u.agencyName,
      contactPerson: u.contactPerson,
      tradeLicenseUrl: await signVerifyKey(u.tradeLicenseUrl),
      submittedAt: u.createdAt,
    })),
  );
}

// ---------------------------------------------------------------------------
// Aggregate pending count (for the admin nav badge)
// ---------------------------------------------------------------------------

export async function getPendingVerificationCount(): Promise<number> {
  const [nid, selfie, agency] = await Promise.all([
    prisma.user.count({ where: { nidVerificationStatus: "PENDING" } }),
    prisma.user.count({ where: { selfieVerificationStatus: "PENDING" } }),
    prisma.user.count({ where: { agencyVerificationStatus: "PENDING_APPROVAL" } }),
  ]);
  return nid + selfie + agency;
}
