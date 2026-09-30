// Idempotent feature-flag seed. SAFE against a live database: it only CREATES
// rows that are missing and never overwrites an existing `enabled` value — an
// admin's deliberate toggle must survive a redeploy that re-runs the seed.
//
// Run standalone: npx tsx prisma/seedFeatureFlags.ts
import { PrismaClient } from "@prisma/client";
import { FEATURE_FLAGS, FEATURE_FLAG_KEYS } from "../lib/constants/featureFlags";

export async function seedFeatureFlags(prisma: PrismaClient) {
  for (const key of FEATURE_FLAG_KEYS) {
    const def = FEATURE_FLAGS[key];
    await prisma.featureFlag.upsert({
      where: { key },
      // Refresh the description (it is documentation, owned by the code) but
      // leave `enabled` alone so a live toggle is never silently reverted.
      update: { description: def.description },
      create: { key, enabled: def.default, description: def.description },
    });
  }
}

// Allow `npx tsx prisma/seedFeatureFlags.ts` without touching anything else.
if (process.argv[1]?.includes("seedFeatureFlags")) {
  const prisma = new PrismaClient();
  seedFeatureFlags(prisma)
    .then(async () => {
      const rows = await prisma.featureFlag.findMany({
        orderBy: { key: "asc" },
        select: { key: true, enabled: true },
      });
      for (const r of rows) console.log(`${r.enabled ? "ON " : "OFF"}  ${r.key}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
