"use client";

import { useState } from "react";
import Image from "next/image";
import { ShowcaseAvatar } from "./ShowcaseAvatar";
import type { ShowcaseProfile } from "@/lib/data/showcase";

/**
 * A showcase photo that degrades to its initials avatar when the image cannot
 * actually be fetched.
 *
 * Why this exists: Supabase's createSignedUrl() signs a PATH. It succeeds
 * whether or not an object lives there, so a profile row pointing at a missing
 * object (seeded placeholder keys, a file deleted from the bucket, a bucket
 * renamed) yields a perfectly valid URL that then 400s on fetch. The server
 * cannot tell the difference without a HEAD request per card, and the cards
 * rendered the broken-image glyph plus alt text — the one state this showcase
 * must never show.
 *
 * `onError` only exists on the client, which is the whole reason this is a
 * client component: the surrounding cards stay server-rendered, and only this
 * leaf opts in.
 */
export function ShowcaseImage({
  profile,
  alt,
  sizes,
  priority,
  className = "object-cover",
  /** Initials size for the fallback, matched to the card it sits in. */
  fallbackTextClass,
  /** Round the fallback (avatars) instead of filling a rectangle. */
  rounded,
}: {
  profile: Pick<ShowcaseProfile, "displayName" | "imageUrl">;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fallbackTextClass?: string;
  rounded?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!profile.imageUrl || failed) {
    return (
      <ShowcaseAvatar
        profile={profile}
        textClass={fallbackTextClass}
        rounded={rounded}
      />
    );
  }

  return (
    <Image
      src={profile.imageUrl}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      // A signed URL that 400s (missing object) or 403s (expired signature)
      // swaps to the initials avatar instead of a broken image.
      onError={() => setFailed(true)}
    />
  );
}
