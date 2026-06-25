import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { uploadObject } from "./supabase";

/**
 * Profile-photo processing. Two derivatives are produced per upload:
 *   - original : auto-oriented, EXIF-stripped, capped at 1600px, webp. Served
 *                only to viewers who have earned access (PUBLIC / APPROVED).
 *   - blurred  : tiny + heavily blurred webp teaser shown to everyone else. The
 *                detail is downsampled away, so the original can't be recovered
 *                from it — this is the privacy boundary, not CSS blur.
 */

export const MAX_PHOTOS = 6;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export type ImageValidationError = "TYPE" | "SIZE" | "EMPTY" | "DECODE";

/** Validate the incoming File against type/size limits. */
export function validateUpload(file: File | null): ImageValidationError | null {
  if (!file || file.size === 0) return "EMPTY";
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) return "TYPE";
  if (file.size > MAX_UPLOAD_BYTES) return "SIZE";
  return null;
}

async function processOriginal(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // honor EXIF orientation, then strip metadata (default)
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function makeBlurred(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 200, height: 200, fit: "inside", withoutEnlargement: true })
    .blur(18)
    .webp({ quality: 45 })
    .toBuffer();
}

export interface StoredImageKeys {
  originalKey: string;
  blurredKey: string;
}

/**
 * Process `file` and upload both derivatives under keys namespaced by profile.
 * Caller is responsible for validation (use validateUpload) and for persisting
 * the returned keys in a ProfileImage row.
 */
export async function storeProfileImage(
  profileId: string,
  file: File,
): Promise<StoredImageKeys> {
  const input = Buffer.from(await file.arrayBuffer());

  let original: Buffer;
  let blurred: Buffer;
  try {
    [original, blurred] = await Promise.all([
      processOriginal(input),
      makeBlurred(input),
    ]);
  } catch {
    // Unreadable / corrupt image — surface as a decode error to the caller.
    throw new Error("DECODE");
  }

  const base = `${profileId}/${randomUUID()}`;
  const originalKey = `${base}.webp`;
  const blurredKey = `${base}_blur.webp`;

  await Promise.all([
    uploadObject(originalKey, original, "image/webp"),
    uploadObject(blurredKey, blurred, "image/webp"),
  ]);

  return { originalKey, blurredKey };
}
