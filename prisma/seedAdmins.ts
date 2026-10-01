/**
 * Non-destructive admin account upsert.
 *
 * Creates the two platform admin accounts, or brings existing accounts up to
 * the right role and verification state. Safe to re-run against a live DB: it
 * only ever writes the fields listed in `update` below, so a pre-existing
 * user keeps their profile, orders, messages and everything else.
 *
 * PASSWORDS COME FROM THE ENVIRONMENT ONLY — there is deliberately no default.
 * A fallback literal here would be a committed credential, and a credential in
 * a repo is disclosed the moment the repo is cloned, pushed or forked. The
 * script refuses to run rather than quietly seeding a password that anyone
 * reading the source already knows.
 *
 *   SUPER_ADMIN_EMAIL (optional) / SUPER_ADMIN_PASSWORD (required)
 *   ADMIN_EMAIL       (optional) / ADMIN_PASSWORD       (required)
 *
 * Run with:  SUPER_ADMIN_PASSWORD=... ADMIN_PASSWORD=... npm run db:seed:admins
 * Or put both in .env (untracked) and run: npm run db:seed:admins
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Read a required secret, or explain exactly what is missing and stop. */
function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing ${name}. Set it in .env (untracked) or inline:
` +
        `  ${name}=<password> npm run db:seed:admins`,
    );
    process.exit(1);
  }
  if (value.length < 8) {
    console.error(`${name} is shorter than 8 characters — refusing to seed it.`);
    process.exit(1);
  }
  return value;
}

const ACCOUNTS = [
  {
    label: "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL ?? "quyum52526@gmail.com",
    password: requireSecret("SUPER_ADMIN_PASSWORD"),
    role: "SUPER_ADMIN" as const,
  },
  {
    label: "Admin (moderator)",
    email: process.env.ADMIN_EMAIL ?? "lmtkalam@gmail.com",
    password: requireSecret("ADMIN_PASSWORD"),
    role: "ADMIN" as const,
  },
];

async function main() {
  for (const account of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 10);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      // Only the fields an admin account needs. Everything else on an
      // existing row is left exactly as it is.
      update: {
        role: account.role,
        passwordHash,
        isMobileVerified: true,
        isEmailVerified: true,
      },
      create: {
        email: account.email,
        role: account.role,
        passwordHash,
        isMobileVerified: true,
        isEmailVerified: true,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    console.log(
      `✔ ${account.label}: ${user.email} -> ${user.role} (id ${user.id})`,
    );
  }

  // Report the final admin roster so the operator can eyeball it.
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true, role: true, isMobileVerified: true, isEmailVerified: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });
  console.log("\nAdmin roster:");
  for (const a of admins) {
    console.log(
      `  ${a.role.padEnd(12)} ${a.email}  mobile=${a.isMobileVerified} email=${a.isEmailVerified}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
