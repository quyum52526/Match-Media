import type { ShowcaseProfile } from "@/lib/data/showcase";

/**
 * Deterministic initials-avatar fallback for showcase cards whose photo is
 * absent or unsignable. Shared by the stacked sections and the hero marquee so
 * a photoless profile always looks intentional rather than like a failed image.
 *
 * The palette is keyed off the display name, so a given profile keeps the same
 * colour between renders (no hydration mismatch, no flicker on re-render).
 */
const AVATAR_HUES = [
  "from-primary/25 via-primary/10 to-canvas text-primary",
  "from-accent/25 via-accent/10 to-canvas text-accent",
  "from-success/20 via-success/10 to-canvas text-success",
  "from-primary/20 via-accent/15 to-canvas text-primary",
] as const;

/** Sum of char codes — stable across renders and server/client boundaries. */
function hueFor(seed: string): string {
  let total = 0;
  for (let i = 0; i < seed.length; i++) total += seed.charCodeAt(i);
  return AVATAR_HUES[total % AVATAR_HUES.length];
}

/**
 * Up to two initials from a display name. Falls back to a neutral glyph for an
 * empty or non-alphanumeric name (e.g. the "Member" privacy placeholder still
 * yields "M", but a name of only punctuation yields "·").
 */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Full-bleed avatar fallback, sized by its container. */
export function ShowcaseAvatar({
  profile,
  /** Tailwind text-size class for the initials — tune per card size. */
  textClass = "text-4xl",
  rounded = false,
}: {
  profile?: Pick<ShowcaseProfile, "displayName">;
  textClass?: string;
  rounded?: boolean;
}) {
  const name = profile?.displayName ?? "";
  const hue = hueFor(name || "placeholder");
  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${hue} ${
        rounded ? "rounded-full" : ""
      }`}
    >
      {name && (
        <span className={`font-display font-semibold tracking-wide ${textClass}`}>
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
