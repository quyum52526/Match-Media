export const dynamic = "force-dynamic";

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";
import { getRoleEntitlements } from "@/lib/roleContext";
import { getAgentDashboardData } from "@/lib/data/agentDashboard";
import { AgentDashboard } from "@/components/agent/AgentDashboard";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Agent Dashboard",
};

/**
 * The verification-agent context's home screen. Same rule as the agency
 * dashboard: the role is read from the DB, never from the context cookie.
 */
export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await requireViewerId(`/${locale}/login`);
  const entitlements = await getRoleEntitlements(viewerId);
  if (entitlements.agent !== "APPROVED") {
    redirect({ href: "/dashboard", locale });
  }

  const [data, user] = await Promise.all([
    getAgentDashboardData(viewerId),
    prisma.user.findUnique({
      where: { id: viewerId },
      select: { email: true, mobile: true },
    }),
  ]);

  return (
    <AuthBackground bgImage="/match-media-bg-03-b.svg">
      <Container className="py-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <AgentDashboard
            data={data}
            email={user?.email ?? ""}
            mobile={user?.mobile ?? null}
          />
        </div>
      </Container>
    </AuthBackground>
  );
}
