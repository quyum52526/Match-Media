export const dynamic = "force-dynamic";

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireViewerId } from "@/lib/session";
import { getRoleEntitlements } from "@/lib/roleContext";
import { getMediaDashboardData } from "@/lib/data/mediaDashboard";
import { MediaDashboard } from "@/components/media/MediaDashboard";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Agency Dashboard · MatchMedia",
};

/**
 * The agency context's home screen.
 *
 * Reachable by anyone whose account holds the agency role — whether they
 * registered as MEDIA or were approved for it later from a personal account.
 * The entitlement is read from the DB here, so the context cookie is never what
 * decides access; an account without the role lands on its personal dashboard.
 */
export default async function AgencyDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await requireViewerId(`/${locale}/login`);
  const entitlements = await getRoleEntitlements(viewerId);
  if (entitlements.agency !== "APPROVED") {
    redirect({ href: "/dashboard", locale });
  }

  const data = await getMediaDashboardData(viewerId);

  return (
    <AuthBackground bgImage="/match-media-bg-03-b.svg">
      <Container className="py-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <MediaDashboard data={data} />
        </div>
      </Container>
    </AuthBackground>
  );
}
