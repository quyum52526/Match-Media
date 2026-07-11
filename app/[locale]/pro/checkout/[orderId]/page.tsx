import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { CheckoutActions } from "@/components/billing/CheckoutActions";
import { formatTaka } from "@/lib/billing/pricing";
import { getOrderForViewer } from "@/lib/data/billing";
import { requireViewerId } from "@/lib/session";

export const metadata = { title: "Checkout · MatchMedia" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale, orderId } = await params;
  const { status } = await searchParams;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Pro.checkout");

  const order = await getOrderForViewer(orderId, viewerId);
  if (!order) notFound();

  const successHref =
    locale === "en" ? `/en/pro/success?order=${order.id}` : `/pro/success?order=${order.id}`;
  const proHref = locale === "en" ? "/en/pro" : "/pro";

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-ink">{t("title")}</h1>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/60">{t("invoice")}</span>
            <span className="font-mono text-ink">{order.invoiceNo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{order.planName}</span>
            <span className="text-ink/70">
              {t("days", { n: String(order.durationDays) })}
            </span>
          </div>

          <hr className="border-ink/10" />

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">{t("subtotal")}</dt>
              <dd className="text-ink">৳{formatTaka(order.baseAmount)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>
                  {t("discount")}
                  {order.couponCode ? ` (${order.couponCode})` : ""}
                </dt>
                <dd>−৳{formatTaka(order.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
              <dt className="text-ink">{t("total")}</dt>
              <dd className="text-ink">৳{formatTaka(order.finalAmount)}</dd>
            </div>
          </dl>

          {order.status === "PAID" ? (
            <Link
              href={successHref}
              className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-white"
            >
              {t("alreadyPaid")}
            </Link>
          ) : (
            <>
              {status === "failed" && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                  {t("failed")}
                </p>
              )}
              <CheckoutActions orderId={order.id} locale={locale} />
              <Link
                href={proHref}
                className="block text-center text-xs text-ink/50 hover:text-ink"
              >
                {t("back")}
              </Link>
            </>
          )}
        </CardBody>
      </Card>
      </div>
    </Container>
  );
}
