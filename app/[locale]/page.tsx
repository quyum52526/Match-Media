import { setRequestLocale } from "next-intl/server";
import { HomeHero } from "@/components/home/HomeHero";
import { ProfileShowcase } from "@/components/home/ProfileShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
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
  return (
    <main>
      <HomeHero />
      <ProfileShowcase />
      <HowItWorks />
      <HomeFooter />
    </main>
  );
}
