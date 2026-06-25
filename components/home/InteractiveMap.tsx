import { getTranslations } from "next-intl/server";
import { Reveal } from "./Reveal";
import { CountUpStat } from "./CountUpStat";

/**
 * "Connecting People" — Midnight Ink band with an accurate Bangladesh map
 * silhouette, 65 breathing location nodes across all districts, dashed
 * connector lines between major cities, and CountUp stats.
 */

// ─── Bangladesh outline ──────────────────────────────────────────────────────
// Clockwise from the Panchagarh (NW) corner. Key features preserved:
//   • The Sylhet division bulge to the NE
//   • The Chittagong Hill Tracts spur extending SE (most distinctive feature)
//   • The Cox's Bazar peninsula tip
//   • The Bay of Bengal coast curving west
//   • The Sundarbans SW coast
//   • The straight western border with India
// ViewBox: 0 0 100 100  (same as the connector-line SVG)
const BD_PATH = [
  "M 20,8",          // Panchagarh (NW tip)
  "L 36,7",          // Lalmonirhat / Kurigram north
  "L 54,10",         // Mymensingh / Netrokona north
  "L 66,12",         // Kishoreganj region
  "L 75,14",         // Sylhet NE — starts bulging east
  "L 83,20",         // Sylhet eastern border
  "L 85,30",         // Habiganj east
  "L 82,40",         // Comilla east border
  "L 84,50",         // Chittagong east border
  "L 90,60",         // CHT north — Myanmar border begins (juts furthest east)
  "L 92,70",         // CHT apex (easternmost point)
  "L 87,78",         // CHT south
  "L 80,87",         // Cox's Bazar coast
  "L 72,92",         // Teknaf peninsula tip (southernmost)
  "L 58,90",         // Bay of Bengal coast — Chittagong coastal
  "L 44,88",         // Barisal / Patuakhali coast
  "L 30,82",         // Khulna / Sundarbans coast
  "L 18,74",         // Satkhira SW coast
  "L 14,62",         // West border — Jessore / Khulna
  "L 12,50",         // West border — Rajshahi south
  "L 13,38",         // West border — Rajshahi
  "L 15,26",         // West border — Chapai Nawabganj
  "L 18,14",         // West border — Rajshahi / Dinajpur north
  "L 20,8 Z",        // Back to NW
].join(" ");

// ─── Node network ─────────────────────────────────────────────────────────────
// 65 nodes representing active users across all divisions & major districts.
// Positions (%) are calibrated to the BD_PATH above.
// size: lg=12px · md=10px · sm=8px · xs=6px
// tone: accent=Champagne gold · primary=Garnet · soft=white/pastel
type Tone = "accent" | "primary" | "soft";
type Size = "lg" | "md" | "sm" | "xs";

const NODES: { x: number; y: number; tone: Tone; size: Size; delay: number }[] = [
  // ── Dhaka Division (highest density cluster) ──
  { x: 44, y: 46, tone: "accent",   size: "lg", delay: 0    }, // Dhaka city core
  { x: 47, y: 44, tone: "primary",  size: "md", delay: 340  },
  { x: 50, y: 48, tone: "accent",   size: "md", delay: 780  },
  { x: 52, y: 46, tone: "soft",     size: "sm", delay: 1150 },
  { x: 46, y: 50, tone: "primary",  size: "sm", delay: 620  },
  { x: 42, y: 44, tone: "soft",     size: "xs", delay: 1400 }, // Manikganj
  { x: 50, y: 40, tone: "accent",   size: "sm", delay: 200  }, // Gazipur
  { x: 54, y: 50, tone: "primary",  size: "sm", delay: 900  }, // Narayanganj
  { x: 58, y: 44, tone: "soft",     size: "xs", delay: 1600 }, // Narsingdi
  { x: 52, y: 56, tone: "accent",   size: "xs", delay: 480  }, // Munshiganj
  { x: 60, y: 40, tone: "primary",  size: "sm", delay: 1050 }, // Kishoreganj
  { x: 40, y: 38, tone: "soft",     size: "xs", delay: 1700 }, // Tangail
  { x: 36, y: 56, tone: "accent",   size: "sm", delay: 740  }, // Faridpur
  { x: 32, y: 52, tone: "soft",     size: "xs", delay: 1850 }, // Rajbari
  { x: 36, y: 64, tone: "primary",  size: "sm", delay: 1250 }, // Gopalganj
  { x: 42, y: 64, tone: "soft",     size: "xs", delay: 320  }, // Madaripur
  { x: 50, y: 60, tone: "accent",   size: "xs", delay: 1500 }, // Shariatpur

  // ── Chittagong Division ──
  { x: 80, y: 60, tone: "primary",  size: "lg", delay: 150  }, // Chittagong city
  { x: 78, y: 58, tone: "accent",   size: "sm", delay: 870  },
  { x: 68, y: 52, tone: "accent",   size: "md", delay: 550  }, // Comilla
  { x: 66, y: 50, tone: "soft",     size: "xs", delay: 1380 },
  { x: 64, y: 62, tone: "primary",  size: "sm", delay: 970  }, // Noakhali
  { x: 70, y: 60, tone: "soft",     size: "xs", delay: 1650 }, // Feni
  { x: 62, y: 60, tone: "accent",   size: "xs", delay: 430  }, // Lakshmipur
  { x: 58, y: 56, tone: "primary",  size: "sm", delay: 1100 }, // Chandpur
  { x: 66, y: 48, tone: "soft",     size: "xs", delay: 720  }, // Brahmanbaria
  { x: 76, y: 78, tone: "accent",   size: "md", delay: 280  }, // Cox's Bazar
  { x: 78, y: 74, tone: "soft",     size: "xs", delay: 1920 },

  // ── Sylhet Division ──
  { x: 78, y: 26, tone: "accent",   size: "md", delay: 600  }, // Sylhet city
  { x: 76, y: 28, tone: "primary",  size: "xs", delay: 1450 },
  { x: 72, y: 36, tone: "primary",  size: "sm", delay: 820  }, // Habiganj
  { x: 76, y: 34, tone: "soft",     size: "xs", delay: 1200 }, // Moulvibazar
  { x: 68, y: 24, tone: "accent",   size: "sm", delay: 390  }, // Sunamganj

  // ── Rajshahi Division ──
  { x: 22, y: 34, tone: "primary",  size: "md", delay: 700  }, // Rajshahi city
  { x: 20, y: 36, tone: "soft",     size: "xs", delay: 1750 },
  { x: 26, y: 32, tone: "accent",   size: "sm", delay: 940  }, // Natore
  { x: 30, y: 38, tone: "soft",     size: "xs", delay: 1300 }, // Pabna
  { x: 16, y: 30, tone: "primary",  size: "xs", delay: 560  }, // Chapai Nawabganj
  { x: 34, y: 36, tone: "accent",   size: "sm", delay: 1080 }, // Sirajganj
  { x: 28, y: 26, tone: "soft",     size: "xs", delay: 1600 }, // Bogura
  { x: 26, y: 22, tone: "primary",  size: "xs", delay: 250  }, // Joypurhat
  { x: 22, y: 26, tone: "accent",   size: "xs", delay: 1850 }, // Naogaon

  // ── Rangpur Division ──
  { x: 28, y: 18, tone: "accent",   size: "md", delay: 450  }, // Rangpur city
  { x: 18, y: 20, tone: "primary",  size: "sm", delay: 1130 }, // Dinajpur
  { x: 22, y: 14, tone: "soft",     size: "xs", delay: 1680 }, // Nilphamari
  { x: 28, y: 14, tone: "accent",   size: "xs", delay: 800  }, // Lalmonirhat
  { x: 34, y: 12, tone: "primary",  size: "xs", delay: 1950 }, // Kurigram
  { x: 32, y: 22, tone: "soft",     size: "xs", delay: 360  }, // Gaibandha
  { x: 16, y: 14, tone: "accent",   size: "xs", delay: 1220 }, // Thakurgaon
  { x: 20, y: 10, tone: "soft",     size: "xs", delay: 670  }, // Panchagarh

  // ── Mymensingh Division ──
  { x: 50, y: 32, tone: "primary",  size: "md", delay: 510  }, // Mymensingh city
  { x: 56, y: 28, tone: "accent",   size: "sm", delay: 1430 }, // Netrokona
  { x: 42, y: 28, tone: "soft",     size: "xs", delay: 880  }, // Jamalpur
  { x: 46, y: 26, tone: "primary",  size: "xs", delay: 1580 }, // Sherpur

  // ── Khulna Division ──
  { x: 24, y: 68, tone: "primary",  size: "md", delay: 190  }, // Khulna city
  { x: 22, y: 60, tone: "accent",   size: "sm", delay: 1020 }, // Jessore
  { x: 16, y: 72, tone: "soft",     size: "xs", delay: 1760 }, // Satkhira
  { x: 22, y: 74, tone: "primary",  size: "xs", delay: 490  }, // Bagerhat
  { x: 28, y: 64, tone: "accent",   size: "xs", delay: 1340 }, // Narail
  { x: 24, y: 56, tone: "soft",     size: "xs", delay: 760  }, // Jhenaidah
  { x: 20, y: 48, tone: "primary",  size: "xs", delay: 1890 }, // Kushtia
  { x: 18, y: 54, tone: "accent",   size: "xs", delay: 630  }, // Chuadanga
  { x: 14, y: 52, tone: "soft",     size: "xs", delay: 1160 }, // Meherpur

  // ── Barisal Division ──
  { x: 44, y: 74, tone: "accent",   size: "md", delay: 840  }, // Barisal city
  { x: 44, y: 80, tone: "primary",  size: "sm", delay: 1470 }, // Patuakhali
  { x: 54, y: 72, tone: "soft",     size: "xs", delay: 310  }, // Bhola
  { x: 34, y: 72, tone: "accent",   size: "xs", delay: 1640 }, // Pirojpur
  { x: 38, y: 70, tone: "primary",  size: "xs", delay: 590  }, // Jhalokati
  { x: 36, y: 80, tone: "soft",     size: "xs", delay: 1290 }, // Barguna
];

// Size → Tailwind class
const SIZE_CLASSES: Record<Size, { outer: string; inner: string }> = {
  lg: { outer: "h-3 w-3",   inner: "h-2.5 w-2.5" },
  md: { outer: "h-2.5 w-2.5", inner: "h-2 w-2"   },
  sm: { outer: "h-2 w-2",   inner: "h-1.5 w-1.5" },
  xs: { outer: "h-1.5 w-1.5", inner: "h-1 w-1"   },
};

// Tone → colours
const TONE_STYLES: Record<Tone, { dot: string; ring: string; glow: string }> = {
  accent:  { dot: "bg-accent",  ring: "bg-accent/50",  glow: "0 0 10px 2px rgba(200,162,75,0.65)"  },
  primary: { dot: "bg-primary", ring: "bg-primary/50", glow: "0 0 10px 2px rgba(140,47,74,0.65)"   },
  soft:    { dot: "bg-white/60", ring: "bg-white/25",  glow: "0 0 8px 2px rgba(255,255,255,0.30)"  },
};

export async function InteractiveMap() {
  const t = await getTranslations("Home.map");

  return (
    <section className="bg-secondary antialiased">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1);   opacity: 1;    }
          50%       { transform: scale(1.7); opacity: 0.75; }
        }
        .pin-breathe {
          animation: breathe 3s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent/70 animate-pulse-ring" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t("badge")}
          </span>
          <h2 className="mt-5 font-display text-3xl font-medium tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base font-normal leading-relaxed text-white/55">
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
            {/* Bangladesh silhouette + connector lines in one SVG */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              {/* Accurate BD silhouette */}
              <path
                d={BD_PATH}
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={0.5}
                strokeLinejoin="round"
              />

              {/* Dashed lines connecting the six major-city nodes (first 6 in NODES) */}
              {([
                [0, 17], [0, 28], [0, 44], [0, 59], [17, 24],
                [28, 32], [44, 59], [17, 28],
              ] as [number, number][]).map(([a, b], i) => (
                <line
                  key={i}
                  x1={NODES[a].x} y1={NODES[a].y}
                  x2={NODES[b].x} y2={NODES[b].y}
                  stroke="rgba(200,162,75,0.18)"
                  strokeWidth={0.35}
                  strokeDasharray="1.5 2.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {/* 65 breathing nodes */}
            {NODES.map((node, i) => {
              const { outer, inner } = SIZE_CLASSES[node.size];
              const { dot, ring, glow } = TONE_STYLES[node.tone];
              return (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <span className={`relative flex ${outer} items-center justify-center`}>
                    <span
                      className={`absolute inline-flex ${outer} rounded-full ${ring} animate-pulse-ring`}
                      style={{ animationDelay: `${node.delay}ms` }}
                    />
                    <span
                      className={`pin-breathe relative inline-flex ${inner} rounded-full ${dot}`}
                      style={{
                        boxShadow: glow,
                        animationDelay: `${node.delay}ms`,
                      }}
                    />
                  </span>
                </span>
              );
            })}
          </div>
        </Reveal>

        {/* Stats — CountUp + live indicator */}
        <Reveal
          delay={220}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center"
        >
          <CountUpStat target={12000} suffix="+" label={t("stat1Label")} />
          <CountUpStat target={64}    suffix=""  label={t("stat2Label")} />

          <div className="flex items-center gap-2 text-sm font-medium text-white/75">
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
