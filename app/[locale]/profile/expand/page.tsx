import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireViewerId } from "@/lib/session";
import { getRoleEntitlements } from "@/lib/roleContext";
import { getOwnApplications } from "@/lib/data/roleApplications";
import { ExpandAccountCard } from "@/components/profile/ExpandAccountCard";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Expand your account",
};

/**
 * "Expand account": apply to also operate as a marriage media agency or as a
 * verification agent, from this same login. The card shows the standing of each
 * service and offers only what this account can still apply for.
 */
export default async function ExpandAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await requireViewerId(`/${locale}/login`);
  const [entitlements, applications, t] = await Promise.all([
    getRoleEntitlements(viewerId),
    getOwnApplications(viewerId),
    getTranslations("ExpandAccount"),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-ink">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("pageSubtitle")}</p>
        </header>
        <ExpandAccountCard
          agency={entitlements.agency}
          agent={entitlements.agent}
          agencyName={entitlements.agencyName}
          agencyRejectionReason={applications.agency?.rejectionReason ?? null}
          agentRejectionReason={applications.agent?.rejectionReason ?? null}
        />
      </div>
    </Container>
  );
}
