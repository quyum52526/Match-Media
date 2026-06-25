import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles, Crown } from "lucide-react";
import { HomeHero } from "@/components/home/HomeHero";
import { StackedFeatureSection } from "@/components/home/StackedFeatureSection";
import { ProfileCarousel } from "@/components/home/ProfileCarousel";
import { HowItWorks } from "@/components/home/HowItWorks";
import { InteractiveMap } from "@/components/home/InteractiveMap";
import { HomeFooter } from "@/components/home/HomeFooter";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getViewerId } from "@/lib/session";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getProfileCompletion } from "@/lib/data/profileCompletion";
import { getProfileViewers } from "@/lib/data/viewers";
import { getViewerProStatus } from "@/lib/data/billing";

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

  // Signed-out visitors: the public landing page.
  const tf = await getTranslations("Home.featured");
  return (
    <main>
      <HomeHero />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16">
        {/* 1. Premium Members (cards on the right) */}
        <StackedFeatureSection
          imagePosition="right"
          icon={<Crown size={24} />}
          title={tf("premiumTitle")}
          description={tf("premiumDesc")}
          redirectLink="/browse"
        />
        {/* 2. New Profiles (cards on the left) */}
        <StackedFeatureSection
          imagePosition="left"
          icon={<Sparkles size={24} />}
          title={tf("newTitle")}
          description={tf("newDesc")}
          redirectLink="/browse"
        />
        {/* 3. Verified Professionals (carousel) */}
        <ProfileCarousel />
      </div>
      <InteractiveMap />
      <HowItWorks />
      <HomeFooter />
    </main>
  );
}
