import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PlanCards } from "@/components/billing/PlanCards";
import { getCheckoutPlans, getViewerProStatus } from "@/lib/data/billing";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Go Pro · MatchMedia",
};

export const dynamic = "force-dynamic";

export default async function ProPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Pro");

  const [plans, status] = await Promise.all([
    getCheckoutPlans(viewerId),
    getViewerProStatus(viewerId),
  ]);

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink/70">
          {t("subtitle")}
        </p>
        {status.isPro && status.proExpiresAt && (
          <p className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {t("activeUntil", {
              date: status.proExpiresAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            })}
          </p>
        )}
      </header>

      <PlanCards plans={plans} locale={locale} alreadyPro={status.isPro} />

      <ul className="mx-auto mt-10 max-w-md space-y-2 text-sm text-ink/70">
        <li>• {t("perks.unlimited")}</li>
        <li>• {t("perks.reveal")}</li>
        <li>• {t("perks.priority")}</li>
      </ul>
    </Container>
  );
}
