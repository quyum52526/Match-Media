import { getTranslations } from "next-intl/server";
import { ShieldCheckIcon } from "@/components/ui/icons";

/**
 * Infinite horizontal marquee at the bottom edge of the Hero — small pill-shaped
 * mini-profile cards ("Verified Member", a blurred placeholder avatar, and a
 * green "Active now" dot) that scroll continuously. The track holds TWO copies
 * of the list and shifts by -50% (CSS `marquee` keyframe), so the loop is
 * seamless; the container is masked at both edges so pills fade in/out. Pure CSS
 * — no JS. Honors prefers-reduced-motion (motion-reduce:animate-none).
 */

const HUES: readonly string[] = [
  "from-rose-200 to-amber-100",
  "from-emerald-200 to-teal-100",
  "from-sky-200 to-indigo-100",
  "from-violet-200 to-fuchsia-100",
  "from-amber-200 to-rose-100",
  "from-teal-200 to-emerald-100",
];

export async function HeroMarquee() {
  const t = await getTranslations("Home.marquee");

  function Pill({ hue, hidden }: { hue: string; hidden?: boolean }) {
    return (
      <div
        aria-hidden={hidden}
        className="flex shrink-0 items-center gap-2.5 rounded-pill border border-hairline bg-surface/90 px-3 py-2 shadow-card backdrop-blur-sm"
      >
        {/* Blurred placeholder avatar (privacy-default) */}
        <span
          className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${hue} blur-[2px]`}
        />
        <div className="leading-tight">
          <p className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-ink">
            {t("verified")}
            <ShieldCheckIcon width={12} height={12} className="text-success" />
          </p>
          <p className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success/70 animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {t("active")}
          </p>
        </div>
      </div>
    );
  }

  // Two copies → -50% shift loops seamlessly. Second copy is decorative.
  const copies = [
    { items: HUES, hidden: false, tag: "a" },
    { items: HUES, hidden: true, tag: "b" },
  ];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div className="flex w-max items-center gap-3 animate-marquee motion-reduce:animate-none">
        {copies.map((c) =>
          c.items.map((hue, i) => (
            <Pill key={`${c.tag}-${i}`} hue={hue} hidden={c.hidden} />
          )),
        )}
      </div>
    </div>
  );
}
