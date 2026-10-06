// ISR: serve the marketing homepage from the CDN and refresh the showcase in the
// background every 10 minutes, instead of querying Prisma/Supabase per request.
//
// NOTE: this only takes effect once the route stops using a dynamic API. The
// [locale] layout awaits getViewerId() (cookies) for the session-aware header,
// which opts the whole route into dynamic rendering — so today this directive is
// inert and the real saving comes from the cached data layer in
// lib/data/showcase.ts. See the comment there.
export const revalidate = 600;

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPageMetadata } from "@/lib/seo/metadata";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { toSeoLocale } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { Sparkles, Crown, ShieldCheck } from "lucide-react";
import { HomeHero } from "@/components/home/HomeHero";
import { StackedFeatureSection } from "@/components/home/StackedFeatureSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { InteractiveMap } from "@/components/home/InteractiveMap";
import { FeaturedInfluencer } from "@/components/home/FeaturedInfluencer";
import {
  getCachedHomepageShowcase,
  getCachedMarqueeProfiles,
} from "@/lib/data/showcase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPageMetadata(locale, "home", "/");
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Public homepage renders for everyone — signed-in users reach their
  // personal dashboard via the "Dashboard" link in the nav.
  const [
    tf,
    { recommendedProfiles, premiumProfiles, newProfiles, verifiedProfiles },
    marqueeProfiles,
  ] = await Promise.all([
    getTranslations("Home.featured"),
    getCachedHomepageShowcase(),
    getCachedMarqueeProfiles(),
  ]);

  return (
    <main>
      <HomeHero marqueeProfiles={marqueeProfiles} />
      <div className="flex flex-col gap-24 py-20 w-full max-w-6xl mx-auto px-4">
        {/* Recommended profiles are curated by admins, then filled with verified members. */}
        <StackedFeatureSection
          imagePosition="right"
          icon={<Sparkles size={24} />}
          title={tf("recommendedTitle")}
          description={tf("recommendedDesc")}
          redirectLink="/browse"
          profiles={recommendedProfiles}
        />
        {/* Premium Members (cards on the right) */}
        <StackedFeatureSection
          imagePosition="right"
          icon={<Crown size={24} />}
          title={tf("premiumTitle")}
          description={tf("premiumDesc")}
          note={tf("privacyNote")}
          redirectLink="/browse"
          profiles={premiumProfiles}
        />
        {/* 2. New Profiles (cards on the left) */}
        <StackedFeatureSection
          imagePosition="left"
          icon={<Sparkles size={24} />}
          title={tf("newTitle")}
          description={tf("newDesc")}
          redirectLink="/browse"
          profiles={newProfiles}
        />
        {/* 3. Verified Professionals (cards on the right — completes the zig-zag) */}
        <StackedFeatureSection
          imagePosition="right"
          icon={<ShieldCheck size={24} />}
          title={tf("verifiedTitle")}
          description={tf("verifiedDesc")}
          redirectLink="/browse"
          profiles={verifiedProfiles}
        />
      </div>
      <InteractiveMap />
      <HowItWorks />
      <FeaturedInfluencer />
      <JsonLd
        data={[organizationSchema(toSeoLocale(locale)), websiteSchema()]}
      />
    </main>
  );
}
