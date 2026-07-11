import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/billing/CheckoutForm";
import { getCheckoutPlans } from "@/lib/data/billing";
import { startPlanCheckout } from "@/lib/actions/billing";
import { requireViewerId } from "@/lib/session";

export const metadata = { title: "Subscription · MatchMedia" };

// Viewer-scoped pricing + order creation — never prerender.
export const dynamic = "force-dynamic";

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  const { plan: planCode } = await searchParams;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);

  // Per-viewer plans (with any RENEWAL promo already folded in). Pick the plan
  // from ?plan=CODE, else the first active plan.
  const plans = await getCheckoutPlans(viewerId);
  if (plans.length === 0) notFound();
  const selected = plans.find((p) => p.code === planCode) ?? plans[0];

  return (
    <Container className="py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">Checkout</h1>
      <CheckoutForm
        planName={selected.name}
        durationDays={selected.durationDays}
        baseAmount={selected.baseAmount}
        discountAmount={selected.discountAmount}
        couponCode={selected.couponCode}
        // Submit creates the order for this plan and redirects to the gateway
        // (SSLCommerz by default). Bound args make it match onComplete's shape.
        onComplete={startPlanCheckout.bind(null, selected.code, locale)}
      />
    </Container>
  );
}
