import "server-only";
import { getSupabaseAdmin } from "@/lib/storage/supabase";

/**
 * The private "verification-docs" bucket: NID images, selfies, trade licences
 * and the documents attached to a role application.
 *
 * Nothing here is ever public. Only the storage KEY is persisted in the DB, and
 * a short-lived signed URL is minted per request when an admin opens the
 * document — so a leaked database row does not leak the images, and a copied
 * URL stops working within the hour.
 */

export const VERIFY_BUCKET = "verification-docs";

/** How long an admin's signed document link stays valid. */
export const DOC_URL_TTL = 3600; // 1 hour

/** Hard cap on an uploaded document, matched by the forms' own checks. */
export const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Store one document and return its key.
 *
 * The key is derived from the owner and the slot, never from the uploaded file
 * name: a caller-controlled name could otherwise escape the user's own folder.
 * `upsert` lets a re-submission replace the previous file in place.
 */
export async function uploadVerificationDoc(
  userId: string,
  slot: string, // e.g. "nid-front", "agency-license"
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  // Only the extension is taken from the name, and only if it looks like one.
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  const key = `${userId}/${slot}.${safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabaseAdmin()
    .storage.from(VERIFY_BUCKET)
    .upload(key, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed (${slot}): ${error.message}`);
  return key;
}

/**
 * A signed, expiring URL for one stored document, or null when there is no key
 * or the bucket cannot produce one. Never throws: a document that will not sign
 * must leave the rest of an admin queue readable.
 */
export async function signVerificationDoc(
  key: string | null | undefined,
): Promise<string | null> {
  if (!key) return null;
  try {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(VERIFY_BUCKET)
      .createSignedUrl(key, DOC_URL_TTL);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
