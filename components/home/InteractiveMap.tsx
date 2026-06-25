import { getTranslations } from "next-intl/server";
import { Reveal } from "./Reveal";

/**
 * "Connecting People" — a dramatic dark (Midnight Ink) band with an abstract
 * dot-map field, softly glowing Garnet/Champagne location pins (live verified
 * members), and faint lines connecting them. The whole map scales-in when it
 * scrolls into view; heading + stats cascade. Tailwind-only animation.
 */

// Pin positions are percentages within the map field. `tone` picks the colour,
// `delay` staggers the pulse so they don't throb in unison.
const PINS = [
  { x: 34, y: 32, tone: "accent", delay: "0ms" },
  { x: 58, y: 26, tone: "primary", delay: "500ms" },
  { x: 47, y: 48, tone: "accent", delay: "1100ms" },
  { x: 68, y: 54, tone: "primary", delay: "300ms" },
  { x: 28, y: 60, tone: "accent", delay: "1500ms" },
  { x: 75, y: 36, tone: "primary", delay: "900ms" },
] as const;

// Connections drawn between pin indices (the "connecting" motif).
const LINES: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 5],
  [0, 2],
  [2, 3],
  [2, 4],
  [3, 5],
];

export async function InteractiveMap() {
  const t = await getTranslations("Home.map");

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
  ];

  return (
    <section className="bg-secondary antialiased">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent/70 animate-pulse-ring" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t("badge")}
          </span>
          <h2 className="mt-5 font-display text-3xl font-medium tracking-tight text-canvas sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base font-normal leading-relaxed text-canvas/60">
            {t("subtitle")}
          </p>
        </Reveal>

        {/* Map field */}
        <Reveal mode="scale" delay={120} className="mt-12">
          <div
            className="relative mx-auto h-72 max-w-4xl overflow-hidden rounded-card border border-white/10 sm:h-96"
            style={{
              backgroundColor: "rgba(255,255,255,0.015)",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1.4px)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(120% 100% at 50% 45%, #000 55%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(120% 100% at 50% 45%, #000 55%, transparent 100%)",
            }}
          >
            {/* Connecting lines */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {LINES.map(([a, b], i) => (
                <line
                  key={i}
                  x1={PINS[a].x}
                  y1={PINS[a].y}
                  x2={PINS[b].x}
                  y2={PINS[b].y}
                  stroke="rgba(200,162,75,0.22)"
                  strokeWidth={0.3}
                  strokeDasharray="1.5 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {/* Pins */}
            {PINS.map((p, i) => {
              const isAccent = p.tone === "accent";
              const dot = isAccent ? "bg-accent" : "bg-primary";
              const ring = isAccent ? "bg-accent/60" : "bg-primary/60";
              const glow = isAccent
                ? "0 0 14px 2px rgba(200,162,75,0.55)"
                : "0 0 14px 2px rgba(140,47,74,0.55)";
              return (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <span className="relative flex h-3 w-3 items-center justify-center">
                    <span
                      className={`absolute inline-flex h-3 w-3 rounded-full ${ring} animate-pulse-ring`}
                      style={{ animationDelay: p.delay }}
                    />
                    <span
                      className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`}
                      style={{ boxShadow: glow }}
                    />
                  </span>
                </span>
              );
            })}
          </div>
        </Reveal>

        {/* Stats */}
        <Reveal
          delay={220}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center"
        >
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-2xl font-medium text-accent">
                {s.value}
              </p>
              <p className="mt-0.5 text-xs font-normal uppercase tracking-wide text-canvas/50">
                {s.label}
              </p>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm font-medium text-canvas/80">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success/70 animate-pulse-ring" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            {t("live")}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
