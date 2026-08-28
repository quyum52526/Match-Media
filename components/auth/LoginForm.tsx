"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authenticate } from "@/lib/actions/auth";
import { enterGuestMode } from "@/lib/actions/guest";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function LoginForm() {
  const t = useTranslations("Auth");
  const guestT = useTranslations("GuestGate");
  const locale = useLocale();
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            {t("password")}
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{t("error")}</p>
        )}

        <Button type="submit" fullWidth disabled={pending}>
          {t("submit")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink/70">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("registerLink")}
        </Link>
      </p>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-hairline" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-white px-2 text-ink/40">{guestT("divider")}</span>
        </div>
      </div>

      {/* Guest preview — sets the guest cookie and lands straight in /browse,
          no login wall. Same server action as the header's "Explore as Guest". */}
      <form action={enterGuestMode}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="outline" fullWidth>
          {guestT("cardExplore")}
        </Button>
      </form>
    </>
  );
}
