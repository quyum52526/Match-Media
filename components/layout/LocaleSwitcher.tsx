"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  en: "EN",
  bn: "BN",
};

export function LocaleSwitcher() {
  const activeLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === activeLocale) return;
    // Re-navigate to the same pathname under the chosen locale.
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center rounded-full border border-charcoal/15 bg-white p-0.5 text-xs font-medium font-sans",
        isPending && "opacity-60",
      )}
    >
      {routing.locales.map((loc) => {
        const isActive = loc === activeLocale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            aria-pressed={isActive}
            disabled={isPending}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              isActive
                ? "bg-trustGreen text-white"
                : "text-charcoal/60 hover:text-charcoal",
            )}
          >
            {LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
