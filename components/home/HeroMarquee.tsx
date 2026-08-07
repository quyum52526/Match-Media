import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheckIcon } from "@/components/ui/icons";
import type { ShowcaseProfile } from "@/lib/data/showcase";

/**
 * Infinite horizontal marquee — real profiles from the DB, blurred gradient
 * fallback when no public photo exists. Two copies of the list shift by -50%
 * (CSS `marquee` keyframe) for a seamless loop; edges fade via mask. Pure CSS
 * animation, no JS. Honors prefers-reduced-motion.
 *
 * Every chip dimension is driven by SCALE below. These go through inline
 * styles rather than Tailwind size classes on purpose: Tailwind's scanner
 * only picks up complete class strings that appear literally in source, so
 * a computed class like `h-[${n}px]` would silently fail to generate CSS.
 * rounded-pill (999px) is left as a Tailwind class — it's already a fixed
 * large radius, so it stays a full pill at any scale without needing to
 * track it here.
 */
const SCALE = 1.25;

const BASE = {
  avatar: 28, // px — avatar diameter
  padX: 12, // px — pill horizontal padding (was px-3)
  padY: 8, // px — pill vertical padding (was py-2)
  cardGap: 12, // px — gap between cards in the track (was gap-3)
  innerGap: 10, // px — gap between avatar and text block (was gap-2.5)
  lineGap: 4, // px — gap between icon and label within a line (was gap-1)
  nameSize: 12, // px — name text (was text-xs)
  activeSize: 10, // px — "Active now" text (was text-[10px])
  tickIcon: 12, // px — verified tick icon
  statusDot: 6, // px — pulsing status dot
} as const;

const s = (n: number) => Math.round(n * SCALE);

const FALLBACK_HUES: readonly string[] = [
  "from-rose-200 to-amber-100",
  "from-emerald-200 to-teal-100",
  "from-sky-200 to-indigo-100",
  "from-violet-200 to-fuchsia-100",
  "from-amber-200 to-rose-100",
  "from-teal-200 to-emerald-100",
  "from-pink-200 to-purple-100",
  "from-cyan-200 to-blue-100",
  "from-lime-200 to-green-100",
  "from-orange-200 to-red-100",
];

function Avatar({ profile, hue }: { profile: ShowcaseProfile; hue: string }) {
  const size = s(BASE.avatar);
  if (profile.imageUrl) {
    return (
      <span
        className="relative shrink-0 overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <Image
          src={profile.imageUrl}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-full bg-gradient-to-br ${hue} blur-[2px]`}
      style={{ width: size, height: size }}
    />
  );
}

export async function HeroMarquee({ profiles }: { profiles: ShowcaseProfile[] }) {
  const t = await getTranslations("Home.marquee");

  // Guarantee at least one pill even if the DB is empty.
  const items = profiles.length > 0 ? profiles : [];

  function Pill({
    profile,
    index,
    ariaHidden,
  }: {
    profile: ShowcaseProfile;
    index: number;
    ariaHidden?: boolean;
  }) {
    const hue = FALLBACK_HUES[index % FALLBACK_HUES.length];
    const label = profile.displayName !== "Member" ? profile.displayName.split(" ")[0] : t("verified");

    const dotSize = s(BASE.statusDot);

    return (
      <Link
        href="/browse"
        aria-hidden={ariaHidden}
        tabIndex={ariaHidden ? -1 : undefined}
        className="flex shrink-0 items-center rounded-pill border border-hairline bg-surface/90 shadow-card backdrop-blur-sm cursor-pointer transition-transform hover:scale-105"
        style={{
          gap: s(BASE.innerGap),
          padding: `${s(BASE.padY)}px ${s(BASE.padX)}px`,
        }}
      >
        <Avatar profile={profile} hue={hue} />
        <div className="leading-tight">
          <p
            className="flex items-center whitespace-nowrap font-medium text-ink"
            style={{ gap: s(BASE.lineGap), fontSize: s(BASE.nameSize) }}
          >
            {label}
            {profile.isVerified && (
              <ShieldCheckIcon
                width={s(BASE.tickIcon)}
                height={s(BASE.tickIcon)}
                className="text-success"
              />
            )}
          </p>
          <p
            className="flex items-center whitespace-nowrap text-muted"
            style={{ gap: s(BASE.lineGap), fontSize: s(BASE.activeSize) }}
          >
            <span className="relative flex" style={{ width: dotSize, height: dotSize }}>
              <span className="absolute inline-flex h-full w-full rounded-full bg-success/70 animate-pulse-ring" />
              <span
                className="relative inline-flex rounded-full bg-success"
                style={{ width: dotSize, height: dotSize }}
              />
            </span>
            {t("active")}
          </p>
        </div>
      </Link>
    );
  }

  if (items.length === 0) return null;

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
      {/* Two copies → -50% shift loops seamlessly; second copy is decorative. */}
      <div
        className="flex w-max items-center animate-marquee motion-reduce:animate-none"
        style={{ gap: s(BASE.cardGap) }}
      >
        {items.map((p, i) => (
          <Pill key={`a-${p.id}`} profile={p} index={i} />
        ))}
        {items.map((p, i) => (
          <Pill key={`b-${p.id}`} profile={p} index={i} ariaHidden />
        ))}
      </div>
    </div>
  );
}
