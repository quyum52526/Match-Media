import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase admin client (service-role key) used for profile-photo
 * storage. The service-role key bypasses RLS and MUST never reach the browser —
 * this module is `server-only` and is imported only from server actions / data
 * loaders. Reused across hot-reloads like the Prisma singleton in lib/prisma.ts.
 */

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "profile-photos";

// Signed-URL lifetime (seconds). Pages that surface photos are dynamic, so a
// 1-hour window is plenty and keeps links from lingering if copied.
export const SIGNED_URL_TTL = 60 * 60;

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

/**
 * Lazily build (and cache) the admin client on first use. Done lazily — not at
 * module load — so importing this file during the build / static page-data
 * collection never throws; the env is only required when storage is actually hit
 * at request time.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.supabaseAdmin = client;
  }
  return client;
}

/** Upload (or overwrite) a single object. Throws on failure. */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .upload(key, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed (${key}): ${error.message}`);
}

/** Best-effort delete of one or more objects. Never throws (cleanup path). */
export async function removeObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove(keys);
}

/**
 * Short-lived signed URL for a single object, or null if it can't be signed.
 * Read paths must degrade gracefully: a signing failure (incl. Supabase not
 * being configured) returns null so the UI falls back to a placeholder rather
 * than 500-ing the page. Uploads, by contrast, still throw loudly.
 */
export async function signUrl(
  key: string,
  expiresIn: number = SIGNED_URL_TTL,
): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .createSignedUrl(key, expiresIn);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Batch-sign many objects in one round-trip. Returns a Map keyed by storage key
 * so callers can look up each profile's URL. Missing/failed keys are omitted.
 */
export async function signUrls(
  keys: string[],
  expiresIn: number = SIGNED_URL_TTL,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (keys.length === 0) return result;
  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .createSignedUrls(keys, expiresIn);
    if (error || !data) return result;
    for (const item of data) {
      if (item.signedUrl && item.path) result.set(item.path, item.signedUrl);
    }
  } catch {
    // Storage unavailable/unconfigured — return what we have (empty) so callers
    // fall back to placeholders instead of failing the whole render.
  }
  return result;
}
