import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  isFeatureFlagKey,
  type FeatureFlagKey,
} from "@/lib/constants/featureFlags";

export {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  isFeatureFlagKey,
  type FeatureFlagKey,
} from "@/lib/constants/featureFlags";

/**
 * Every flag's effective value, `cache`d per request so a page that checks
 * several flags still makes one query.
 *
 * A key with no row falls back to its code-defined default rather than `false`.
 * That matters: defaulting everything to `false` would silently disable NID and
 * selfie collection on a fresh database, and the failure would look like a bug
 * in the upload form rather than a missing seed.
 */
export const getFeatureFlags = cache(
  async (): Promise<Record<FeatureFlagKey, boolean>> => {
    const defaults = Object.fromEntries(
      FEATURE_FLAG_KEYS.map((k) => [k, FEATURE_FLAGS[k].default]),
    ) as Record<FeatureFlagKey, boolean>;

    try {
      const rows = await prisma.featureFlag.findMany({
        select: { key: true, enabled: true },
      });
      for (const row of rows) {
        if (isFeatureFlagKey(row.key)) defaults[row.key] = row.enabled;
      }
    } catch (error) {
      // An unreachable/unmigrated table must not take down the app — fall back
      // to the defaults, which are the intended production posture anyway.
      console.error("feature flags unavailable, using defaults", error);
    }
    return defaults;
  },
);

/** One flag's effective value. */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  return (await getFeatureFlags())[key];
}
