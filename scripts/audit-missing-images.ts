/**
 * Audit every storage key the database references, and report the ones that
 * are not actually in the bucket.
 *
 * Why this exists: Supabase's createSignedUrl() signs a PATH, not an object. It
 * succeeds whether or not a file lives there, so a row pointing at a missing
 * object yields a valid URL that 400s when a browser fetches it. The UI now
 * degrades to a placeholder on that error (see components/home/ShowcaseImage),
 * but the dead rows stay in the database, keep being chosen as a profile's
 * "best photo", and keep costing a signature per render. This finds them.
 *
 * Usage:
 *   npx tsx scripts/audit-missing-images.ts              # report only
 *   npx tsx scripts/audit-missing-images.ts --cleanup    # also delete/clear
 *   npx tsx scripts/audit-missing-images.ts --json       # machine-readable
 *
 * --cleanup is destructive and asks for confirmation unless --yes is passed:
 *   • a ProfileImage whose ORIGINAL is missing is deleted (the row is useless —
 *     every viewer path needs the original or the blur, and a row with neither
 *     renders nothing);
 *   • a ProfileImage whose BLURRED derivative alone is missing is NOT deleted,
 *     because the original is still serveable to an approved viewer. It is
 *     reported so the blur can be regenerated;
 *   • a missing User document/avatar key is set to NULL, which returns that
 *     account to the "not submitted" state its own UI already handles.
 *
 * Nothing here deletes a FILE. It only removes references to files that are
 * already gone, so a mistake costs a re-upload, never an image.
 */

import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const PHOTO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "profile-photos";
const DOCS_BUCKET = "verification-docs";

const args = process.argv.slice(2);
const CLEANUP = args.includes("--cleanup");
const ASSUME_YES = args.includes("--yes") || args.includes("-y");
const AS_JSON = args.includes("--json");

/** One referenced key, with enough context to act on it. */
interface Ref {
  bucket: string;
  key: string;
  /** Where the reference lives, e.g. "ProfileImage.originalKey". */
  field: string;
  profileId?: string;
  userId?: string;
  /** Row id, for the cleanup step. */
  rowId: string;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} — load the project's .env before running.`);
    process.exit(1);
  }
  return value;
}

function supabase(): SupabaseClient {
  // Service-role key: this reads private buckets and must bypass RLS.
  // SUPABASE_URL is what the app's own storage client reads; the
  // NEXT_PUBLIC_ twin is the browser copy and is accepted as a fallback.
  return createClient(
    process.env.SUPABASE_URL?.trim() || env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

/* ------------------------------------------------------------------ */
/* Collecting every referenced key                                     */
/* ------------------------------------------------------------------ */

async function collectRefs(): Promise<Ref[]> {
  const refs: Ref[] = [];

  const images = await prisma.profileImage.findMany({
    select: {
      id: true,
      profileId: true,
      originalKey: true,
      blurredKey: true,
      moderationStatus: true,
      isPrimary: true,
      profile: { select: { userId: true } },
    },
  });

  for (const image of images) {
    const shared = {
      bucket: PHOTO_BUCKET,
      profileId: image.profileId,
      userId: image.profile?.userId ?? undefined,
      rowId: image.id,
    };
    if (image.originalKey) {
      refs.push({ ...shared, key: image.originalKey, field: "ProfileImage.originalKey" });
    }
    if (image.blurredKey) {
      refs.push({ ...shared, key: image.blurredKey, field: "ProfileImage.blurredKey" });
    }
  }

  // Avatars and logos live in the photo bucket; identity documents live in the
  // private documents bucket. Both are signed the same way at read time, so
  // both can rot the same way.
  const users = await prisma.user.findMany({
    select: {
      id: true,
      agentAvatarKey: true,
      agencyLogo: true,
      tradeLicenseUrl: true,
      nidFrontKey: true,
      nidBackKey: true,
      selfieKey: true,
    },
  });

  const userFields: [keyof (typeof users)[number], string, string][] = [
    ["agentAvatarKey", "User.agentAvatarKey", PHOTO_BUCKET],
    ["agencyLogo", "User.agencyLogo", PHOTO_BUCKET],
    ["tradeLicenseUrl", "User.tradeLicenseUrl", DOCS_BUCKET],
    ["nidFrontKey", "User.nidFrontKey", DOCS_BUCKET],
    ["nidBackKey", "User.nidBackKey", DOCS_BUCKET],
    ["selfieKey", "User.selfieKey", DOCS_BUCKET],
  ];

  for (const user of users) {
    for (const [column, field, bucket] of userFields) {
      const key = user[column];
      if (typeof key === "string" && key.trim()) {
        refs.push({ bucket, key: key.trim(), field, userId: user.id, rowId: user.id });
      }
    }
  }

  return refs;
}

/* ------------------------------------------------------------------ */
/* Checking existence                                                  */
/* ------------------------------------------------------------------ */

/**
 * Which of these keys exist, resolved with one `list` per directory rather
 * than one request per key.
 *
 * `list` returns the names in a prefix, so a profile with eight photos costs a
 * single call. A HEAD per key would be thousands of round trips on a real
 * database, and Supabase rate-limits long before that finishes.
 */
async function findExisting(
  client: SupabaseClient,
  refs: Ref[],
): Promise<Set<string>> {
  const byDir = new Map<string, { bucket: string; dir: string }>();
  for (const ref of refs) {
    const slash = ref.key.lastIndexOf("/");
    const dir = slash === -1 ? "" : ref.key.slice(0, slash);
    byDir.set(`${ref.bucket}:${dir}`, { bucket: ref.bucket, dir });
  }

  const existing = new Set<string>();
  const dirs = [...byDir.values()];
  const CONCURRENCY = 8;

  for (let i = 0; i < dirs.length; i += CONCURRENCY) {
    const batch = dirs.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ bucket, dir }) => {
        // 1000 is the API's page ceiling; a single profile folder never
        // approaches it (MAX_PHOTOS caps a gallery), so one page is enough.
        const { data, error } = await client.storage
          .from(bucket)
          .list(dir, { limit: 1000 });
        if (error) {
          // A listing that fails tells us nothing about existence. Say so
          // loudly rather than reporting every key under it as missing —
          // --cleanup would then delete rows whose files are perfectly fine.
          console.error(
            `  ! could not list ${bucket}/${dir || "(root)"}: ${error.message}`,
          );
          LIST_FAILURES.add(`${bucket}:${dir}`);
          return;
        }
        for (const entry of data ?? []) {
          // `id` is null for a sub-folder placeholder, which is not an object.
          if (entry.id === null) continue;
          existing.add(`${bucket}:${dir ? `${dir}/` : ""}${entry.name}`);
        }
      }),
    );
  }

  return existing;
}

/** Directories whose listing errored — their keys are "unknown", not missing. */
const LIST_FAILURES = new Set<string>();

function dirOf(key: string): string {
  const slash = key.lastIndexOf("/");
  return slash === -1 ? "" : key.slice(0, slash);
}

/* ------------------------------------------------------------------ */
/* Cleanup                                                             */
/* ------------------------------------------------------------------ */

async function confirm(question: string): Promise<boolean> {
  if (ASSUME_YES) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

async function cleanup(missing: Ref[]): Promise<void> {
  // A row whose original is gone cannot serve any viewer, so it goes. A row
  // that only lost its blur keeps the original and is left for regeneration.
  const deletableImageIds = [
    ...new Set(
      missing
        .filter((r) => r.field === "ProfileImage.originalKey")
        .map((r) => r.rowId),
    ),
  ];
  const blurOnly = missing.filter(
    (r) =>
      r.field === "ProfileImage.blurredKey" &&
      !deletableImageIds.includes(r.rowId),
  );
  const userRefs = missing.filter((r) => r.field.startsWith("User."));

  console.log("\nCleanup plan");
  console.log(`  delete ${deletableImageIds.length} ProfileImage row(s) (original missing)`);
  console.log(`  clear  ${userRefs.length} User column(s) (document/avatar missing)`);
  console.log(
    `  keep   ${blurOnly.length} ProfileImage row(s) whose blur alone is missing — regenerate instead`,
  );

  if (!deletableImageIds.length && !userRefs.length) {
    console.log("\nNothing to clean up.");
    return;
  }

  if (!(await confirm("\nApply this? Rows are deleted permanently."))) {
    console.log("Aborted — nothing was changed.");
    return;
  }

  if (deletableImageIds.length) {
    const { count } = await prisma.profileImage.deleteMany({
      where: { id: { in: deletableImageIds } },
    });
    console.log(`  deleted ${count} ProfileImage row(s)`);
  }

  // Grouped per user so an account with three dead documents is one update.
  const byUser = new Map<string, Record<string, null>>();
  for (const ref of userRefs) {
    const column = ref.field.split(".")[1];
    const patch = byUser.get(ref.rowId) ?? {};
    patch[column] = null;
    byUser.set(ref.rowId, patch);
  }
  for (const [userId, patch] of byUser) {
    await prisma.user.update({ where: { id: userId }, data: patch });
  }
  if (byUser.size) {
    console.log(`  cleared columns on ${byUser.size} user(s)`);
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                             */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const client = supabase();

  const refs = await collectRefs();
  if (!refs.length) {
    console.log("No storage keys referenced in the database.");
    return;
  }

  const existing = await findExisting(client, refs);

  const unknown = refs.filter((r) =>
    LIST_FAILURES.has(`${r.bucket}:${dirOf(r.key)}`),
  );
  const checked = refs.filter(
    (r) => !LIST_FAILURES.has(`${r.bucket}:${dirOf(r.key)}`),
  );
  const missing = checked.filter((r) => !existing.has(`${r.bucket}:${r.key}`));
  const valid = checked.length - missing.length;

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          totalReferenced: refs.length,
          checked: checked.length,
          valid,
          missing: missing.map((r) => ({
            bucket: r.bucket,
            key: r.key,
            field: r.field,
            profileId: r.profileId,
            userId: r.userId,
          })),
          unverified: unknown.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("\nStorage key audit");
  console.log(`  buckets        ${PHOTO_BUCKET}, ${DOCS_BUCKET}`);
  console.log(`  referenced     ${refs.length}`);
  console.log(`  checked        ${checked.length}`);
  console.log(`  valid          ${valid}`);
  console.log(`  missing        ${missing.length}`);
  if (unknown.length) {
    console.log(
      `  unverified     ${unknown.length} (their folder could not be listed — treated as neither valid nor missing)`,
    );
  }

  if (missing.length) {
    console.log("\nMissing objects:");
    for (const ref of missing) {
      const owner = ref.profileId
        ? `profile=${ref.profileId}${ref.userId ? ` user=${ref.userId}` : " (agency-managed)"}`
        : `user=${ref.userId}`;
      console.log(`  ${ref.field.padEnd(26)} ${ref.bucket}/${ref.key}`);
      console.log(`  ${" ".repeat(26)} ${owner}`);
    }
    if (!CLEANUP) {
      console.log(
        "\nRe-run with --cleanup to delete the dead rows (it confirms first).",
      );
    }
  } else {
    console.log("\nEvery referenced key is present in storage.");
  }

  if (CLEANUP && missing.length) await cleanup(missing);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
