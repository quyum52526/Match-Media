import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";
import { MockPay } from "@/components/billing/MockPay";
import { formatTaka } from "@/lib/billing/pricing";
import { getOrderForViewer } from "@/lib/data/billing";
import { requireViewerId } from "@/lib/session";

export const metadata = { title: "Payment · MatchMedia" };
export const dynamic = "force-dynamic";

/**
 * Simulated hosted-gateway page. A real gateway would render its own UI on its
 * own domain; this stands in so the create-session -> pay -> verify -> activate
 * flow runs end to end without an external dependency.
 */
export default async function MockPayPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Pro.pay");

  const order = await getOrderForViewer(orderId, viewerId);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardBody className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-wide text-charcoal/40">
            {t("sandbox")}
          </p>
          <h1 className="text-xl font-bold text-charcoal">{t("title")}</h1>
          <p className="text-sm text-charcoal/70">
            {t("amount")}:{" "}
            <span className="font-semibold text-charcoal">
              ৳{formatTaka(order.finalAmount)}
            </span>
          </p>
          <p className="text-xs text-charcoal/45">{order.invoiceNo}</p>

          <MockPay orderId={order.id} locale={locale} />
        </CardBody>
      </Card>
    </main>
  );
}
