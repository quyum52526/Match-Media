// Always fetch fresh data — the showcase profiles change as users join/are verified.
export const dynamic = "force-dynamic";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles, Crown, ShieldCheck } from "lucide-react";
import { HomeHero } from "@/components/home/HomeHero";
import { StackedFeatureSection } from "@/components/home/StackedFeatureSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { InteractiveMap } from "@/components/home/InteractiveMap";
import { HomeFooter } from "@/components/home/HomeFooter";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getViewerId } from "@/lib/session";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getProfileCompletion } from "@/lib/data/profileCompletion";
import { getProfileViewers } from "@/lib/data/viewers";
import { getViewerProStatus } from "@/lib/data/billing";
import {
  getPremiumShowcaseProfiles,
  getNewShowcaseProfiles,
  getVerifiedShowcaseProfiles,
} from "@/lib/data/showcase";

// Viewer cards shown directly on the dashboard before the "See all" link.
const DASHBOARD_VIEWERS = 6;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Signed-in users get a personalized dashboard; visitors get the landing page.
  const viewerId = await getViewerId();
  if (viewerId) {
    const [stats, completion, viewers, proStatus] = await Promise.all([
      getDashboardStats(viewerId),
      getProfileCompletion(viewerId),
      getProfileViewers(viewerId, DASHBOARD_VIEWERS),
      getViewerProStatus(viewerId),
    ]);
    return (
      <Dashboard
        stats={stats}
        completion={completion}
        viewers={viewers}
        proStatus={proStatus}
      />
    );
  }

  // Signed-out visitors: fetch translations + real profile data in parallel.
  const [tf, premiumProfiles, newProfiles, verifiedProfiles] = await Promise.all([
    getTranslations("Home.featured"),
    getPremiumShowcaseProfiles(),
    getNewShowcaseProfiles(),
    getVerifiedShowcaseProfiles(),
  ]);

  return (
    <main>
      <HomeHero />
      <div className="flex flex-col gap-24 py-20 w-full max-w-6xl mx-auto px-4">
        {/* 1. Premium Members (cards on the right) */}
        <StackedFeatureSection
          imagePosition="right"
          icon={<Crown size={24} />}
          title={tf("premiumTitle")}
          description={tf("premiumDesc")}
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
      <HomeFooter />
    </main>
  );
}
