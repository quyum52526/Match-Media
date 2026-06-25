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
 */

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
  if (profile.imageUrl) {
    return (
      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
        <Image
          src={profile.imageUrl}
          alt=""
          fill
          sizes="28px"
          className="object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${hue} blur-[2px]`}
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

    return (
      <Link
        href="/browse"
        aria-hidden={ariaHidden}
        tabIndex={ariaHidden ? -1 : undefined}
        className="flex shrink-0 items-center gap-2.5 rounded-pill border border-hairline bg-surface/90 px-3 py-2 shadow-card backdrop-blur-sm cursor-pointer transition-transform hover:scale-105"
      >
        <Avatar profile={profile} hue={hue} />
        <div className="leading-tight">
          <p className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-ink">
            {label}
            {profile.isVerified && (
              <ShieldCheckIcon width={12} height={12} className="text-success" />
            )}
          </p>
          <p className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success/70 animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
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
      <div className="flex w-max items-center gap-3 animate-marquee motion-reduce:animate-none">
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
