/**
 * "Featured Influencer" testimonial band — sits directly above the HomeFooter.
 *
 * A full-width, cinematic dark section: a Garnet→Champagne radial gradient mesh
 * over a deep Midnight base, softened with blurred glow blobs. The content is a
 * single unified glassmorphism banner — ONE frosted canvas: a full-body portrait
 * in a narrower left column (~33%) runs edge-to-edge into a dominant, left-
 * aligned testimonial (~66%). No inner borders or gaps: the portrait and the
 * quote share the same glass surface. On mobile the banner stacks — portrait
 * first, then the quote.
 *
 * Theme note: the app's Tailwind color tokens have no <alpha-value> slot, so
 * `/opacity` modifiers on them silently fail (see memory:
 * tailwind-opacity-tokens-broken). Every translucent fill / border / text tone
 * here is therefore written as a literal rgba() arbitrary value, derived from
 * the brand hex: Garnet #8c2f4a, Champagne #c8a24b, Primary-dark #5e1e31,
 * Midnight #1e2436, Ivory #fbf7f2.
 *
 * The portrait uses next/image (`fill` + object-cover object-top) so it stays
 * crisp and edge-to-edge within its column. Server component — no interactivity.
 */

import Image from "next/image";

// --- Testimonial content ---
const INFLUENCER = {
  name: "Giyanna Rose",
  designation: "Social Media Influencer",
  imageSrc: "/giyanna-rose.png",
  quote:
    "MatchMedia redefined what discretion means to me. I found a genuine connection — private, secure, and refreshingly human — without ever compromising who I am.",
};

export function FeaturedInfluencer() {
  return (
    <section
      aria-label="Featured influencer testimonial"
      className="relative w-full overflow-hidden bg-secondary antialiased"
      style={{
        // Base deep-ink tone + layered Garnet/Champagne radial mesh for depth.
        backgroundImage:
          "radial-gradient(circle at 15% 20%, rgba(140,47,74,0.45), transparent 45%)," +
          "radial-gradient(circle at 85% 12%, rgba(200,162,75,0.20), transparent 42%)," +
          "radial-gradient(circle at 80% 88%, rgba(94,30,49,0.55), transparent 52%)," +
          "radial-gradient(circle at 25% 92%, rgba(140,47,74,0.30), transparent 48%)",
      }}
    >
      {/* Soft floating glow blobs — pure decoration, hidden from AT. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgba(140,47,74,0.35)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[rgba(200,162,75,0.14)] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16 lg:py-20">
        {/* Eyebrow */}
        <div className="mb-7 flex justify-center sm:mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(200,162,75,0.35)] bg-[rgba(200,162,75,0.08)] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-accent">
            <span aria-hidden className="text-[0.7rem] leading-none">
              ✦
            </span>
            Featured Influencer
          </span>
        </div>

        {/* Single unified glass banner. The glassmorphism lives on THIS one
            container; the image and text regions inside share it seamlessly —
            no inner borders, no gap. A short banner height keeps it wide and
            elegant rather than a tall block. */}
        <figure className="relative overflow-hidden rounded-[28px] border border-[rgba(251,247,242,0.14)] bg-[rgba(255,255,255,0.06)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          {/* Top inner highlight — sells the single glass edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-[linear-gradient(90deg,transparent,rgba(251,247,242,0.35),transparent)]"
          />

          {/* ~1:2 grid (portrait : text), gap-0. Fixed banner height on desktop;
              stacks on mobile. */}
          <div className="grid items-stretch lg:h-[400px] lg:grid-cols-3">
            {/* ---- Portrait region (~33%, edge-to-edge) ---- */}
            <div className="relative h-[300px] overflow-hidden sm:h-[360px] lg:col-span-1 lg:h-full">
              {/* Soft brand wash behind the figure — shows through where a
                  cutout PNG is transparent, adding a premium glow. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(200,162,75,0.16),transparent_55%),radial-gradient(circle_at_45%_100%,rgba(140,47,74,0.4),transparent_62%)]"
              />

              <Image
                src={INFLUENCER.imageSrc}
                alt={INFLUENCER.name}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover object-top"
              />

              {/* Seam blend: on desktop, fade the portrait's right edge into the
                  shared glass so the text region reads as one continuous surface
                  (no visible divider). */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-32 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06))] lg:block"
              />
            </div>

            {/* ---- Testimonial region (~66%, dominant, no own card) ---- */}
            <div className="relative flex flex-col justify-center px-7 py-9 sm:px-10 lg:col-span-2 lg:px-14 lg:py-12">
              <div className="max-w-2xl">
                <span
                  aria-hidden
                  className="block font-display text-5xl leading-none text-[rgba(200,162,75,0.6)]"
                >
                  &ldquo;
                </span>
                <blockquote className="-mt-2 font-display text-xl font-normal italic leading-relaxed text-[rgba(251,247,242,0.92)] sm:text-2xl sm:leading-relaxed">
                  {INFLUENCER.quote}
                </blockquote>

                <figcaption className="mt-6 border-t border-[rgba(251,247,242,0.12)] pt-5">
                  <div className="font-display text-lg font-semibold text-white sm:text-xl">
                    {INFLUENCER.name}
                  </div>
                  <div className="mt-1 font-body text-sm font-medium uppercase tracking-[0.14em] text-accent">
                    {INFLUENCER.designation}
                  </div>
                </figcaption>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
