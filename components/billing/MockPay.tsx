"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { completeMockPayment } from "@/lib/actions/billing";

export function MockPay({ orderId, locale }: { orderId: string; locale: string }) {
  const t = useTranslations("Pro.pay");
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<"SUCCESS" | "FAIL" | null>(null);

  function settle(result: "SUCCESS" | "FAIL") {
    setOutcome(result);
    startTransition(async () => {
      await completeMockPayment(orderId, result, locale);
    });
  }

  return (
    <div className="space-y-2 pt-2">
      <Button
        variant="primary"
        fullWidth
        disabled={pending}
        onClick={() => settle("SUCCESS")}
      >
        {pending && outcome === "SUCCESS" ? t("processing") : t("succeed")}
      </Button>
      <Button
        variant="ghost"
        fullWidth
        disabled={pending}
        onClick={() => settle("FAIL")}
      >
        {t("fail")}
      </Button>
    </div>
  );
}
