import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
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
    <Container className="flex flex-col items-center py-16 text-center">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckIcon width={30} height={30} />
      </span>
      <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink/70">
        {order
          ? t("bodyPaid", { plan: order.planName, amount: formatTaka(order.finalAmount) })
          : t("body")}
      </p>
      {status.proExpiresAt && (
        <p className="mt-3 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
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
      </div>
    </Container>
  );
}
