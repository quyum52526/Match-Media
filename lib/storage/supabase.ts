import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase admin client (service-role key) used for profile-photo
 * storage. The service-role key bypasses RLS and MUST never reach the browser —
 * this module is `server-only` and is imported only from server actions / data
 * loaders. Reused across hot-reloads like the Prisma singleton in lib/prisma.ts.
 */

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "profile-photos";

/**
 * Default signed-URL lifetime (seconds) for GATED photos.
 *
 * Deliberately short. A signed URL is a bearer capability: anyone holding it can
 * fetch the object until it expires, with no further authorization check. So
 * this value IS the revocation window — after an owner denies or revokes photo
 * access (respondToPhotoRequest), a previously-issued link keeps working for up
 * to this long. One hour is the cap on that exposure.
 *
 * Do NOT raise this to get better browser caching. Use PUBLIC_URL_TTL for
 * imagery that has no access gate to revoke in the first place.
 */
export const SIGNED_URL_TTL = 60 * 60;

/**
 * Signed-URL lifetime for images the owner has explicitly made PUBLIC, and for
 * blurred derivatives — neither is gated, so there is nothing to revoke and a
 * long-lived link leaks nothing.
 *
 * 24h lets the browser and the Next image optimizer actually reuse a derivative
 * instead of re-fetching on every signature rotation. Any cache built on top of
 * these URLs must expire well before this (see SHOWCASE_REVALIDATE_SECONDS).
 */
export const PUBLIC_URL_TTL = 60 * 60 * 24;

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
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item.signedUrl) result.set(keys[i], item.signedUrl);
    }
  } catch {
    // Storage unavailable/unconfigured — return what we have (empty) so callers
    // fall back to placeholders instead of failing the whole render.
  }
  return result;
}
