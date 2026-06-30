export const dynamic = "force-dynamic";

import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getViewerId } from "@/lib/session";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getProfileCompletion } from "@/lib/data/profileCompletion";
import { getProfileViewers } from "@/lib/data/viewers";
import { getViewerProStatus } from "@/lib/data/billing";
import { getMyPostedJobs, getAgentApplications } from "@/lib/data/jobs";
import { prisma } from "@/lib/prisma";

const DASHBOARD_VIEWERS = 6;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await getViewerId();
  if (!viewerId) {
    redirect(locale === "en" ? "/en/login" : "/login");
  }
  // redirect() throws internally; assert non-null so downstream calls type-check.
  const userId = viewerId!;

  // Gate: users who haven't chosen an account category must finish onboarding.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountCategory: true, role: true },
  });
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && !user?.accountCategory) {
    redirect(locale === "en" ? "/en/onboarding" : "/onboarding");
  }

  const isAgent = user?.role === "AGENT";

  const [stats, completion, viewers, proStatus, myPostedJobs, agentApplications] =
    await Promise.all([
      getDashboardStats(userId),
      getProfileCompletion(userId),
      getProfileViewers(userId, DASHBOARD_VIEWERS),
      getViewerProStatus(userId),
      // Every role can see their own posted jobs
      getMyPostedJobs(userId),
      // Only agents see their application list
      isAgent ? getAgentApplications(userId) : Promise.resolve(undefined),
    ]);

  return (
    <Dashboard
      stats={stats}
      completion={completion}
      viewers={viewers}
      proStatus={proStatus}
      myPostedJobs={myPostedJobs}
      agentApplications={agentApplications}
      userRole={user?.role ?? null}
    />
  );
}
