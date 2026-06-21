import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { formatTaka } from "@/lib/billing/pricing";
import { getOrderForViewer, getViewerProStatus } from "@/lib/data/billing";
import { requireViewerId } from "@/lib/session";

export const metadata = { title: "Welcome to Pro · MatchMedia" };
export const dynamic = "force-dynamic";

export default async function ProSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const { order: orderId } = await searchParams;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Pro.success");

  const [order, status] = await Promise.all([
    orderId ? getOrderForViewer(orderId, viewerId) : Promise.resolve(null),
    getViewerProStatus(viewerId),
  ]);

  const homeHref = locale === "en" ? "/en" : "/";

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-trustGreen/10 text-trustGreen">
        <CheckIcon width={30} height={30} />
      </span>
      <h1 className="text-2xl font-bold text-charcoal">{t("title")}</h1>
      <p className="mt-2 text-sm text-charcoal/70">
        {order
          ? t("bodyPaid", { plan: order.planName, amount: formatTaka(order.finalAmount) })
          : t("body")}
      </p>
      {status.proExpiresAt && (
        <p className="mt-3 rounded-full bg-trustGreen/10 px-3 py-1 text-xs font-medium text-trustGreen">
          {t("validUntil", {
            date: status.proExpiresAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          })}
        </p>
      )}
      <Link href={homeHref} className="mt-6">
        <Button variant="primary">{t("cta")}</Button>
      </Link>
    </main>
  );
}
