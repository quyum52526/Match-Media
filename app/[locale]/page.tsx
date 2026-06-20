import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getViewerId } from "@/lib/session";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getProfileCompletion } from "@/lib/data/profileCompletion";
import { getProfileViewers } from "@/lib/data/viewers";

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
    const [stats, completion, viewers] = await Promise.all([
      getDashboardStats(viewerId),
      getProfileCompletion(viewerId),
      getProfileViewers(viewerId, DASHBOARD_VIEWERS),
    ]);
    return (
      <Dashboard stats={stats} completion={completion} viewers={viewers} />
    );
  }

  const t = await getTranslations("Home");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-charcoal sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-3 text-charcoal/60">{t("subtitle")}</p>
      <Link href="/profiles/demo" className="mt-8">
        <Button size="lg">{t("viewSample")}</Button>
      </Link>
    </main>
  );
}
