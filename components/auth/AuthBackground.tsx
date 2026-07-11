import type { ReactNode } from "react";

interface AuthBackgroundProps {
  /**
   * Public path to the brand line-art SVG for this page.
   * Defaults to match-media-bg-01.
   */
  bgImage?: string;
  children: ReactNode;
}

/**
 * Full-viewport branded background shared by the auth + profile pages.
 *
 * The line-art image is applied dynamically via inline style so each page can
 * pass its own `bgImage` (bg-01/02/03). It sits over an ivory canvas and is
 * softened by a gradient wash, keeping the motif a subtle, elegant texture.
 * Page content is layered above via the relative wrapper. Tweak the overlay
 * here once and every page that uses it stays visually consistent.
 */
export function AuthBackground({
  bgImage = "/match-media-bg-01.svg",
  children,
}: AuthBackgroundProps) {
  return (
    <div className="relative min-h-screen w-full bg-canvas">
      {/* Brand line-art — per-page image, scales to cover, never repeats. */}
      <div
        aria-hidden
        style={{ backgroundImage: `url('${bgImage}')` }}
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
      />
      {/* Soft ivory wash: keeps the art subtle and fades the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas/50 via-canvas/20 to-canvas/70"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
