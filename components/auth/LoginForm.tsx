"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { authenticate } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const t = useTranslations("Auth");
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-charcoal">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-charcoal">
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600">{t("error")}</p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
