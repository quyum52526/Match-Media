"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StarIcon } from "@/components/ui/icons";
import { formatTaka } from "@/lib/billing/pricing";
import { createUpgradeOrder } from "@/lib/actions/billing";
import type { CheckoutPlan } from "@/lib/data/billing";

export function PlanCards({
  plans,
  locale,
  alreadyPro,
}: {
  plans: CheckoutPlan[];
  locale: string;
  alreadyPro: boolean;
}) {
  const t = useTranslations("Pro");
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);

  function choose(code: string) {
    setChosen(code);
    startTransition(async () => {
      await createUpgradeOrder(code, locale);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {plans.map((plan) => {
        const discounted = plan.discountAmount > 0;
        // The 12-month plan is the best value — highlight it.
        const featured = plan.durationDays >= 365;
        return (
          <Card
            key={plan.code}
            className={featured ? "border-gold ring-1 ring-gold/40" : undefined}
          >
            <CardBody className="flex flex-col items-center text-center">
              {featured && (
                <Badge variant="gold" className="mb-2 bg-gold text-white">
                  {t("bestValue")}
                </Badge>
              )}
              <h2 className="text-lg font-semibold text-charcoal">{plan.name}</h2>

              <div className="mt-3">
                {discounted && (
                  <span className="mr-2 text-sm text-charcoal/40 line-through">
                    ৳{formatTaka(plan.baseAmount)}
                  </span>
                )}
                <span className="text-2xl font-bold text-charcoal">
                  ৳{formatTaka(plan.finalAmount)}
                </span>
              </div>

              {discounted && plan.couponCode && (
                <p className="mt-1 text-xs font-medium text-trustGreen">
                  {t("promoApplied", { code: plan.couponCode })}
                </p>
              )}

              <Button
                variant={featured ? "gold" : "outline"}
                className="mt-5"
                fullWidth
                disabled={pending || alreadyPro}
                onClick={() => choose(plan.code)}
              >
                <StarIcon width={16} height={16} />
                {pending && chosen === plan.code ? t("processing") : t("choose")}
              </Button>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
