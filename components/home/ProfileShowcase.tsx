import { getTranslations, getLocale } from "next-intl/server";
import {
  SHOWCASE,
  SHOWCASE_HUES,
  type ShowcaseKey,
} from "./showcaseData";
import { ProfileShowcaseCard, type CardLabels } from "./ProfileShowcaseCard";

/**
 * Homepage profile showcase: three horizontally-scrollable rows (Premium / New /
 * Verified Professionals) on the Ivory surface. Each row is a snap-scroll strip
 * of privacy-default cards. Server component — data is mock (see showcaseData).
 */
export async function ProfileShowcase() {
  const t = await getTranslations("Home.showcase");
  const locale = await getLocale();

  const labels: CardLabels = {
    premium: t("premium"),
    mobileVerified: t("mobileVerified"),
    member: t("member"),
    photoPrivate: t("photoPrivate"),
  };

  const titleFor: Record<ShowcaseKey, { title: string; sub: string }> = {
    vip: { title: t("vip"), sub: t("vipSub") },
    new: { title: t("new"), sub: t("newSub") },
    professionals: { title: t("professionals"), sub: t("professionalsSub") },
  };

  return (
    <section className="bg-ivory antialiased">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        {SHOWCASE.map((section) => (
          <div key={section.key}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-charcoal">
                  {titleFor[section.key].title}
                </h2>
                <p className="text-xs font-normal text-charcoal/50">
                  {titleFor[section.key].sub}
                </p>
              </div>
            </div>

            {/* Horizontal snap-scroll strip; bleeds to the screen edge on mobile */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
              {section.profiles.map((profile, i) => (
                <ProfileShowcaseCard
                  key={profile.id}
                  profile={profile}
                  locale={locale}
                  hue={SHOWCASE_HUES[i % SHOWCASE_HUES.length]}
                  labels={labels}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
