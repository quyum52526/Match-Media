/**
 * Promote an existing user to the ADMIN role WITHOUT reseeding (the live DB has
 * real data; the full seed does deleteMany). Idempotent.
 *
 * Run: npx tsx --env-file=.env prisma/promoteAdmin.ts <email>
 */
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx prisma/promoteAdmin.ts <email>");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });
  console.log(`Promoted ${user.email} -> ${user.role} (id ${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
