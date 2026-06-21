// Idempotent billing-catalog seed: upserts Plan + Coupon reference rows by code.
// SAFE to run against a live/drifted DB — it never deletes user data (unlike the
// full prisma/seed.ts clean-slate reset). Run: npx tsx prisma/seedCatalog.ts
import { PrismaClient } from "@prisma/client";
import { PLAN_CATALOG, COUPON_CATALOG } from "../lib/constants/plans";

/** Upsert Plan + Coupon catalog rows by code. Reusable from the full seed. */
export async function seedBillingCatalog(prisma: PrismaClient) {
  for (const p of PLAN_CATALOG) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        durationDays: p.durationDays,
        priceAmount: p.priceAmount,
        sortOrder: p.sortOrder,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        durationDays: p.durationDays,
        priceAmount: p.priceAmount,
        sortOrder: p.sortOrder,
      },
    });
  }

  for (const c of COUPON_CATALOG) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        trigger: c.trigger,
        appliesToPlan: c.appliesToPlan,
        grantsPlanCode: c.grantsPlanCode,
        perUserLimit: c.perUserLimit,
        maxRedemptions: c.maxRedemptions,
        isActive: true,
      },
      create: {
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        trigger: c.trigger,
        appliesToPlan: c.appliesToPlan,
        grantsPlanCode: c.grantsPlanCode,
        perUserLimit: c.perUserLimit,
        maxRedemptions: c.maxRedemptions,
      },
    });
  }
}

// Standalone runner: `npx tsx prisma/seedCatalog.ts` (or via the helper below).
async function main() {
  const prisma = new PrismaClient();
  try {
    await seedBillingCatalog(prisma);
    const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
    const coupons = await prisma.coupon.findMany();
    console.log("Catalog seeded.");
    console.table(
      plans.map((p) => ({ code: p.code, name: p.name, days: p.durationDays, BDT: p.priceAmount / 100 })),
    );
    console.table(
      coupons.map((c) => ({ code: c.code, type: c.discountType, value: c.discountValue, trigger: c.trigger })),
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Only auto-run when invoked directly, not when imported by prisma/seed.ts.
if (process.argv[1] && process.argv[1].includes("seedCatalog")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
