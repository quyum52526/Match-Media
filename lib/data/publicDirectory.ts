import "server-only";
import { createHmac } from "node:crypto";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { mobileCountsTowardTrust } from "@/lib/contactGate";
import { trustScoreOf } from "@/lib/data/profiles";
import sharp from "sharp";
import { STORAGE_BUCKET, getSupabaseAdmin } from "@/lib/storage/supabase";

/**
 * Data for the public, indexable district landing pages (/find/[district]).
 *
 * THE PRIVACY BOUNDARY for anonymous visitors. Everything here is served to
 * search engines and logged-out users, so:
 *   • Prisma `select` reads only the columns listed in SAFE_PROFILE_SELECT —
 *     fullName, bio, contact details and the image originalKey are never even
 *     loaded, so they cannot leak through a later refactor of the mapper.
 *   • Photos are ALWAYS the server-side blurred derivative, even when the owner
 *     marked a photo PUBLIC (stricter than the homepage showcase).
 *   • Only moderation-APPROVED photos are considered.
 *   • The profile id is replaced by an opaque one-way hash before it leaves
 *     this module, so cards can't be correlated with /profiles/[id].
 *   • No storage URL is ever emitted. Storage keys are "{profileId}/{uuid}_blur.webp",
 *     so a signed URL — even to the blurred file — would publish the profile
 *     id and the original's path. Instead the blurred derivative is downloaded
 *     here, shrunk to a tiny thumbnail and inlined as a data: URI.
 */

// ---------------------------------------------------------------------------
// District slugs
// ---------------------------------------------------------------------------

/** "Cox's Bazar" → "coxs-bazar". */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Canonical slug → DISTRICTS entry (all 64 districts). */
const DISTRICT_BY_SLUG = new Map(DISTRICTS.map((d) => [toSlug(d.value), d]));

/** Legacy / alternate English spellings → canonical slug (301-redirected). */
const SLUG_ALIASES: Record<string, string> = {
  chittagong: "chattogram",
  comilla: "cumilla",
  barisal: "barishal",
  jessore: "jashore",
  bogra: "bogura",
  coxsbazar: "coxs-bazar",
  "chapai-nawabganj": "chapainawabganj",
  netrakona: "netrokona",
  jhalakati: "jhalokati",
};

/** Districts prerendered at build and listed in the sitemap. */
export const FEATURED_DISTRICT_SLUGS = [
  "dhaka",
  "chattogram",
  "sylhet",
  "rajshahi",
  "khulna",
  "barishal",
  "rangpur",
  "cumilla",
] as const;

export interface ResolvedDistrict {
  /** Canonical URL slug, e.g. "chattogram". */
  slug: string;
  /** Normalized DB value, e.g. "Chattogram". */
  name: string;
  /** Bangla name, e.g. "চট্টগ্রাম". */
  bn: string;
  /** True when the requested slug was an alias of `slug`. */
  isAlias: boolean;
}

/** Maps a URL slug (any case, canonical or alias) to the DB district, or null. */
export function resolveDistrict(input: string): ResolvedDistrict | null {
  const raw = input.toLowerCase();
  const slug = SLUG_ALIASES[raw] ?? raw;
  const district = DISTRICT_BY_SLUG.get(slug);
  if (!district) return null;
  return {
    slug,
    name: district.value,
    bn: district.bn,
    isAlias: slug !== input,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Real candidate profiles only (same rule as browse/showcase): agency-managed
 * profiles (userId = null) or self-registered SELF accounts. Manager, agent
 * and admin accounts never count.
 */
function candidatesIn(district: string): Prisma.ProfileWhereInput {
  return {
    district,
    OR: [{ userId: null }, { user: { accountCategory: "SELF" } }],
  };
}

/** Cache window for counts and anonymized samples. */
const REVALIDATE_SECONDS = 60 * 30;

export interface DistrictStats {
  district: string;
  totalProfiles: number;
  verifiedProfiles: number;
}

/** Aggregate counts for a district, or null for an unknown slug. */
export async function getDistrictStats(
  districtSlug: string,
): Promise<DistrictStats | null> {
  const resolved = resolveDistrict(districtSlug);
  if (!resolved) return null;
  return cachedStats(resolved.name);
}

const cachedStats = unstable_cache(
  async (district: string): Promise<DistrictStats> => {
    const where = candidatesIn(district);
    const [totalProfiles, verifiedProfiles] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.count({ where: { ...where, isVerified: true } }),
    ]);
    return { district, totalProfiles, verifiedProfiles };
  },
  ["public-directory-stats"],
  { revalidate: REVALIDATE_SECONDS, tags: ["public-directory"] },
);

export interface AnonymizedProfile {
  /** Keyed one-way hash (HMAC) — NOT the profile id. Safe as a React key. */
  id: string;
  gender: string;
  age: number;
  district: string;
  /**
   * Tiny inline data: URI of the blurred derivative (no storage path, no
   * token), or null — the card then shows a gradient placeholder.
   */
  blurredImageUrl: string | null;
  isVerified: boolean;
  trustScore: number;
}

/**
 * The ONLY columns this module ever reads. Adding a field here is a privacy
 * decision: it will be fetched for anonymous, indexable pages.
 */
const SAFE_PROFILE_SELECT = {
  id: true,
  gender: true,
  dateOfBirth: true,
  district: true,
  isVerified: true,
  user: {
    select: {
      isMobileVerified: true,
      nidVerificationStatus: true,
      selfieVerificationStatus: true,
    },
  },
  images: {
    where: { moderationStatus: "APPROVED" },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    take: 1,
    select: { blurredKey: true },
  },
} satisfies Prisma.ProfileSelect;

/** Up to `take` anonymized sample profiles for a district ([] for unknown slugs). */
export async function getDistrictSampleProfiles(
  districtSlug: string,
  take = 6,
): Promise<AnonymizedProfile[]> {
  const resolved = resolveDistrict(districtSlug);
  if (!resolved) return [];
  return cachedSamples(resolved.name, Math.min(Math.max(take, 1), 12));
}

const cachedSamples = unstable_cache(
  async (district: string, take: number): Promise<AnonymizedProfile[]> => {
    const [rows, countMobile] = await Promise.all([
      prisma.profile.findMany({
        where: candidatesIn(district),
        // Verified members first, then the newest.
        orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
        take,
        select: SAFE_PROFILE_SELECT,
      }),
      mobileCountsTowardTrust(),
    ]);

    return Promise.all(
      rows.map(async (row) => {
        const blurredKey = row.images[0]?.blurredKey;
        return {
          id: opaqueId(row.id),
          gender: row.gender,
          age: calcAge(row.dateOfBirth),
          district: row.district ?? district,
          blurredImageUrl: blurredKey ? await inlineBlurred(blurredKey) : null,
          isVerified: row.isVerified,
          trustScore: trustScoreOf([
            row.isVerified,
            ...(countMobile ? [row.user?.isMobileVerified ?? false] : []),
            row.user?.nidVerificationStatus === "APPROVED",
            row.user?.selfieVerificationStatus === "APPROVED",
          ]),
        };
      }),
    );
  },
  ["public-directory-samples"],
  { revalidate: REVALIDATE_SECONDS, tags: ["public-directory"] },
);

/**
 * Keyed hash so an outsider who knows a profile id can't hash it themselves to
 * check whether that member appears on a public page.
 */
function opaqueId(profileId: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "public-directory")
    .update(profileId)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Downloads the blurred derivative and re-encodes it as a ~24x30 WebP data URI
 * (well under 1 KB). Shrinking a blurred image this far makes it impossible to
 * reconstruct; the card scales it up behind a CSS blur. Any storage failure
 * degrades to null (placeholder card) instead of failing the page.
 */
async function inlineBlurred(blurredKey: string): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .download(blurredKey);
    if (error || !data) return null;
    const tiny = await sharp(Buffer.from(await data.arrayBuffer()))
      .resize(24, 30, { fit: "cover" })
      .webp({ quality: 50 })
      .toBuffer();
    return `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}
