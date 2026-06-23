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
const STYLES = {
  inline: {
    ok: "text-xs font-medium text-ink/55",
    limit:
      "flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-ink/70",
  },
  banner: {
    ok: "mb-4 rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2 text-xs font-medium text-ink/60",
    limit:
      "mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-ink/70",
  },
} as const;

export function QuotaNote({
  quota,
  namespace = "Profile.photo.quota",
  variant = "inline",
}: {
  quota: PhotoQuota;
  /** Which `*.quota` message namespace to pull copy from. */
  namespace?: string;
  variant?: "inline" | "banner";
}) {
  const t = useTranslations(namespace);
  if (quota.unlimited) return null;

  const styles = STYLES[variant];

  if (quota.remaining > 0) {
    return (
      <div className={styles.ok}>
        {t("remaining", { n: String(quota.remaining), limit: String(quota.limit) })}
      </div>
    );
  }

  return (
    <div className={styles.limit}>
      <span className="font-semibold text-ink">{t("limitReachedTitle")}</span>
      <span>{t("limitReached", { limit: String(quota.limit) })}</span>
      <Link
        href="/pro"
        className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline"
      >
        <StarIcon width={12} height={12} />
        {t("upgrade")}
      </Link>
    </div>
  );
}

/** Browse-grid photo-request banner: reads the live quota from context. */
export function QuotaBanner() {
  const ctx = usePhotoQuota();
  if (!ctx) return null;
  return <QuotaNote quota={ctx.quota} variant="banner" />;
}
