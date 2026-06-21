"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StarIcon } from "@/components/ui/icons";
import type { PhotoQuota } from "@/lib/data/billing";
import type { PhotoRequestResult } from "@/lib/actions/funnel";

interface QuotaCtx {
  quota: PhotoQuota;
  /** Reconcile against the server's authoritative result after a request. */
  applyResult: (result: PhotoRequestResult) => void;
}

const Ctx = createContext<QuotaCtx | null>(null);

/**
 * Holds the live photo-request quota for a page (e.g. the browse grid), so the
 * "N left today" hint decrements correctly as the user requests several people.
 */
export function PhotoQuotaProvider({
  initial,
  children,
}: {
  initial: PhotoQuota;
  children: ReactNode;
}) {
  const [remaining, setRemaining] = useState(initial.remaining);
  const applyResult = useCallback((result: PhotoRequestResult) => {
    if (!result.unlimited) setRemaining(result.remaining);
  }, []);

  return (
    <Ctx.Provider
      value={{
        quota: { unlimited: initial.unlimited, remaining, limit: initial.limit },
        applyResult,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePhotoQuota(): QuotaCtx | null {
  return useContext(Ctx);
}

/**
 * Presentational quota feedback: a subtle "N left today" hint while requests
 * remain, or a clear limit-reached message with an upgrade nudge at zero. Pro
 * (unlimited) renders nothing.
 */
export function QuotaNote({
  quota,
  className,
}: {
  quota: PhotoQuota;
  className?: string;
}) {
  const t = useTranslations("Profile.photo.quota");
  if (quota.unlimited) return null;

  if (quota.remaining > 0) {
    return (
      <p className={className ?? "text-xs font-medium text-charcoal/55"}>
        {t("remaining", { n: String(quota.remaining), limit: String(quota.limit) })}
      </p>
    );
  }

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-charcoal/70"
      }
    >
      <span className="font-semibold text-charcoal">{t("limitReachedTitle")}</span>
      <span>{t("limitReached", { limit: String(quota.limit) })}</span>
      <Link
        href="/pro"
        className="inline-flex items-center gap-1 font-semibold text-gold underline-offset-2 hover:underline"
      >
        <StarIcon width={12} height={12} />
        {t("upgrade")}
      </Link>
    </div>
  );
}

/** Browse-grid banner: reads the live quota from context. */
export function QuotaBanner() {
  const ctx = usePhotoQuota();
  if (!ctx) return null;
  return <QuotaNote quota={ctx.quota} className={bannerClass(ctx.quota.remaining)} />;
}

function bannerClass(remaining: number): string {
  return remaining > 0
    ? "mb-4 rounded-xl border border-charcoal/10 bg-ivory/60 px-3 py-2 text-xs font-medium text-charcoal/60"
    : "mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-charcoal/70";
}
