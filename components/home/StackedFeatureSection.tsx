import type { ReactNode } from "react";
import { BadgeCheck, Crown, Lock, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ShowcaseProfile } from "@/lib/data/showcase";
import { ShowcaseAvatar } from "./ShowcaseAvatar";
import { ShowcaseImage } from "./ShowcaseImage";

export interface StackedFeatureSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  imagePosition: "left" | "right";
  redirectLink: string;
  profiles?: ShowcaseProfile[];
  /** Decorative name shown on the front card when no real profiles are provided. */
  badgeName?: string;
  /**
   * Optional privacy/reassurance line rendered under the description. Opt-in per
   * section (rather than always-on) so only the sections that need the caveat
   * carry it — the homepage passes it for Premium Members.
   */
  note?: string;
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
  // Showcase cards never show a lock icon: the server already reduced the photo
  // to one that is safe to publish (original for PUBLIC, blurred derivative
  // otherwise — see pickShowcaseKey in lib/data/showcase.ts).
  //
  // Three states, in order: a real signed photo; a real profile with no usable
  // photo (initials avatar); or no profile at all, when the DB returned fewer
  // than three rows for this section (decorative gradient, no initials).
  // ShowcaseImage keeps the initials fallback for a photo whose signed URL
  // resolves to nothing (see its own note); a card with no profile at all still
  // falls through to the decorative gradient below.
  const body = profile ? (
    <div className="relative h-full w-full">
      <ShowcaseImage
        profile={profile}
        alt={isFront ? profile.displayName : ""}
        sizes="220px"
        priority={isFront}
        fallbackTextClass="text-5xl"
      />
    </div>
  ) : (
    <ShowcaseAvatar profile={profile} textClass="text-5xl" />
  );

  // Name badge — only on the front (top) card.
  const badge = isFront ? (
    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-card">
      {profile ? profile.displayName : badgeName}
      {profile ? (
        <>
          {profile.isFeatured && (
            <Star size={13} className="fill-amber-500 text-amber-500" />
          )}
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
  note,
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

        {/* Privacy caveat. Inherits the parent's centre-on-mobile /
            left-on-desktop alignment: the flex row re-justifies at md, and the
            icon gets its own top offset so it aligns to the first line rather
            than the vertical centre once the text wraps to two lines. */}
        {note && (
          <p className="mt-3 flex max-w-md items-start justify-center gap-2 text-xs leading-relaxed text-ink/60 sm:text-sm md:justify-start">
            <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-left">{note}</span>
          </p>
        )}
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

      {profiles && profiles.length > 3 && (
        <div className="flex gap-3 overflow-x-auto pb-2 md:col-span-2">
          {profiles.slice(3).map((profile) => (
            <Link
              key={profile.id}
              href={`/profiles/${profile.id}`}
              className="flex w-64 shrink-0 items-center gap-3 rounded-xl border border-ink/10 bg-white p-2 shadow-sm transition hover:shadow-md"
            >
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg">
                <ShowcaseImage
                  profile={profile}
                  alt={profile.displayName}
                  sizes="64px"
                  priority={false}
                />
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {profile.displayName}
                </span>
                {profile.location && (
                  <span className="block truncate text-xs text-ink/60">
                    {profile.location}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
