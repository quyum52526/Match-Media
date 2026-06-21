"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { initiatePayment } from "@/lib/actions/billing";

export function CheckoutActions({
  orderId,
  locale,
}: {
  orderId: string;
  locale: string;
}) {
  const t = useTranslations("Pro.checkout");
  const [pending, startTransition] = useTransition();

  function pay() {
    startTransition(async () => {
      await initiatePayment(orderId, locale);
    });
  }

  return (
    <Button variant="gold" fullWidth disabled={pending} onClick={pay}>
      {pending ? t("redirecting") : t("pay")}
    </Button>
  );
}
