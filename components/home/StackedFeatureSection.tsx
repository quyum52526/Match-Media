import type { ReactNode } from "react";
import Image from "next/image";
import { BadgeCheck, Crown, LockKeyhole } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ShowcaseProfile } from "@/lib/data/showcase";

export interface StackedFeatureSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  imagePosition: "left" | "right";
  redirectLink: string;
  profiles?: ShowcaseProfile[];
  /** Decorative name shown on the front card when no real profiles are provided. */
  badgeName?: string;
}

/** Inner content of a single stacked card. */
function CardFace({
  profile,
  isFront,
  badgeName,
}: {
  profile: ShowcaseProfile | undefined;
  isFront: boolean;
  badgeName: string;
}) {
  // Card body: real photo, or pastel placeholder with a lock icon.
  const body = profile?.imageUrl ? (
    <div className="relative h-full w-full">
      <Image
        src={profile.imageUrl}
        alt={isFront ? profile.displayName : ""}
        fill
        className="object-cover"
        sizes="220px"
        priority={isFront}
      />
    </div>
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-accent/30 via-canvas to-primary/20">
      <LockKeyhole size={28} className="text-primary/30" />
    </div>
  );

  // Name badge — only on the front (top) card.
  const badge = isFront ? (
    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-card">
      {profile ? profile.displayName : badgeName}
      {profile ? (
        <>
          {profile.isVerified && <BadgeCheck size={14} className="text-success" />}
          {profile.isPro && <Crown size={12} className="text-accent" />}
        </>
      ) : (
        <BadgeCheck size={14} className="text-success" />
      )}
    </span>
  ) : null;

  return (
    <>
      {body}
      {badge}
    </>
  );
}

export function StackedFeatureSection({
  title,
  description,
  icon,
  imagePosition,
  redirectLink,
  profiles,
  badgeName = "Faisal Ansari",
}: StackedFeatureSectionProps) {
  const cardsLeft = imagePosition === "left";

  // Explicit index assignment — each variable is a distinct profile (or undefined
  // when the DB returns fewer than 3 results for this section).
  const profile1 = profiles?.[0]; // front / top card  — most visible
  const profile2 = profiles?.[1]; // middle card
  const profile3 = profiles?.[2]; // back / bottom card

  return (
    <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
      {/* ---------- Text + icon ---------- */}
      <div
        className={`flex flex-col items-center text-center md:items-start md:text-left ${
          cardsLeft ? "md:order-2" : "md:order-1"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-card">
          {icon}
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-accent sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-base font-normal leading-relaxed text-muted">
          {description}
        </p>
      </div>

      {/* ---------- Clickable card stack ---------- */}
      <Link
        href={redirectLink}
        aria-label={title}
        className={`group relative flex h-[350px] w-full cursor-pointer items-center justify-center ${
          cardsLeft ? "md:order-1" : "md:order-2"
        }`}
      >
        {/* Back card — profile3, rotated left */}
        <div className="absolute z-10 h-[300px] w-[220px] overflow-hidden rounded-2xl border-2 border-primary shadow-lg transition-all duration-300 ease-out -translate-x-6 rotate-[-8deg] group-hover:-translate-x-14 group-hover:rotate-[-12deg]">
          <CardFace profile={profile3} isFront={false} badgeName={badgeName} />
        </div>

        {/* Middle card — profile2, rotated right */}
        <div className="absolute z-20 h-[300px] w-[220px] overflow-hidden rounded-2xl border-2 border-primary shadow-lg transition-all duration-300 ease-out translate-x-4 rotate-[6deg] group-hover:translate-x-12 group-hover:rotate-[10deg]">
          <CardFace profile={profile2} isFront={false} badgeName={badgeName} />
        </div>

        {/* Front card — profile1, straight, name badge */}
        <div className="absolute z-30 h-[300px] w-[220px] overflow-hidden rounded-2xl border-2 border-primary shadow-2xl transition-all duration-300 ease-out group-hover:-translate-y-2">
          <CardFace profile={profile1} isFront badgeName={badgeName} />
        </div>
      </Link>
    </div>
  );
}
