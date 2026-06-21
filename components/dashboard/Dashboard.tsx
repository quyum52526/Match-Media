import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { WhoViewedMe } from "@/components/profile/WhoViewedMe";
import { Badge } from "@/components/ui/Badge";
import {
  EyeIcon,
  InboxIcon,
  HeartIcon,
  RingIcon,
  SearchIcon,
  StarIcon,
} from "@/components/ui/icons";
import type { DashboardStats } from "@/lib/data/dashboard";
import type { ProfileCompletion } from "@/lib/data/profileCompletion";
import type { ProfileViewers } from "@/lib/data/viewers";
import type { ViewerProStatus } from "@/lib/data/billing";

/** Renew CTA turns urgent (gold) when fewer than this many days remain. */
const RENEW_SOON_DAYS = 14;

export async function Dashboard({
  stats,
  completion,
  viewers,
  proStatus,
}: {
  stats: DashboardStats;
  completion: ProfileCompletion;
  viewers: ProfileViewers;
  proStatus: ViewerProStatus;
}) {
  const t = await getTranslations("Dashboard");
  const v = await getTranslations("Viewers");

  const greeting = stats.firstName
    ? t("greetingName", { name: stats.firstName })
    : t("greeting");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-charcoal/60">{t("subtitle")}</p>
      </header>

      <div className="mb-6">
        <ProStatusCard proStatus={proStatus} t={t} />
      </div>

      {completion.score < 100 && (
        <div className="mb-6">
          <ProfileCompletionBanner completion={completion} />
        </div>
      )}

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<EyeIcon width={20} height={20} />}
          value={stats.profileViews}
          label={t("stats.views")}
          href="/viewers"
        />
        <StatCard
          icon={<InboxIcon width={20} height={20} />}
          value={stats.pendingPhotoRequests}
          label={t("stats.photoRequests")}
          href="/requests"
          highlight={stats.pendingPhotoRequests > 0}
        />
        <StatCard
          icon={<HeartIcon width={20} height={20} />}
          value={stats.newInterests}
          label={t("stats.interests")}
          href="/interests"
          highlight={stats.newInterests > 0}
        />
        <StatCard
          icon={<RingIcon width={20} height={20} />}
          value={stats.matches}
          label={t("stats.matches")}
        />
      </div>

      {/* Primary call to action */}
      <Card className="border-trustGreen/20 bg-trustGreen/[0.04]">
        <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-charcoal">
              {t("cta.title")}
            </p>
            <p className="mt-0.5 text-sm text-charcoal/60">{t("cta.body")}</p>
          </div>
          <Link href="/browse" className="shrink-0">
            <Button size="lg">
              <SearchIcon width={18} height={18} />
              {t("cta.action")}
            </Button>
          </Link>
        </CardBody>
      </Card>

      {/* Who viewed me */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-charcoal">
            {v("heading")}
          </h2>
          {viewers.total > viewers.viewers.length && (
            <Link
              href="/viewers"
              className="shrink-0 text-sm font-medium text-trustGreen hover:underline"
            >
              {v("seeAll", { n: String(viewers.total) })}
            </Link>
          )}
        </div>
        <WhoViewedMe viewers={viewers.viewers} />
      </section>
    </main>
  );
}

function StatCard({
  icon,
  value,
  label,
  href,
  highlight,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  href?: string;
  highlight?: boolean;
}) {
  const card = (
    <Card
      className={
        highlight
          ? "h-full ring-1 ring-trustGreen/30 transition-colors"
          : "h-full transition-colors hover:border-charcoal/20"
      }
    >
      <CardBody className="flex flex-col gap-2 p-4 sm:p-5">
        <span
          className={
            highlight
              ? "flex h-9 w-9 items-center justify-center rounded-xl bg-trustGreen/10 text-trustGreen"
              : "flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal/50"
          }
        >
          {icon}
        </span>
        <span className="font-sans text-2xl font-bold leading-none text-charcoal">
          {value}
        </span>
        <span className="text-xs font-medium text-charcoal/60">{label}</span>
      </CardBody>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * Membership status banner: shows whether the viewer is Pro (with expiry +
 * days remaining) or Free (or lapsed), and a clear upgrade/renew CTA. The renew
 * CTA turns gold (urgent) when Pro is expired or within RENEW_SOON_DAYS.
 */
function ProStatusCard({
  proStatus,
  t,
}: {
  proStatus: ViewerProStatus;
  t: Translate;
}) {
  const expiresAt = proStatus.proExpiresAt;
  const state: "ACTIVE" | "EXPIRED" | "FREE" = proStatus.isPro
    ? "ACTIVE"
    : expiresAt
      ? "EXPIRED"
      : "FREE";

  const dateStr = expiresAt
    ? expiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const daysLeft =
    state === "ACTIVE" && expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
      : null;
  const soon = daysLeft !== null && daysLeft <= RENEW_SOON_DAYS;

  // Per-state presentation.
  const isPro = state === "ACTIVE";
  const urgent = state === "EXPIRED" || soon || state === "FREE";

  const accent = isPro
    ? "border-gold/30 bg-gold/[0.04]"
    : state === "EXPIRED"
      ? "border-gold/40 bg-gold/[0.06]"
      : "border-charcoal/10";

  const detail =
    state === "ACTIVE"
      ? dateStr
        ? `${t("pro.activeUntil", { date: dateStr })}${
            daysLeft !== null ? ` · ${t("pro.daysLeft", { n: String(daysLeft) })}` : ""
          }`
        : t("pro.lifetime")
      : state === "EXPIRED" && dateStr
        ? t("pro.expiredOn", { date: dateStr })
        : t("pro.freeHint");

  const ctaLabel =
    state === "ACTIVE"
      ? t("pro.renew")
      : state === "EXPIRED"
        ? t("pro.renewNow")
        : t("pro.upgrade");

  return (
    <Card className={accent}>
      <CardBody className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span
            className={
              isPro
                ? "flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold"
                : "flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal/50"
            }
          >
            <StarIcon width={20} height={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-charcoal">
                {isPro ? t("pro.statusPro") : t("pro.statusFree")}
              </span>
              <Badge
                variant={isPro ? "gold" : "neutral"}
                className={isPro ? "bg-gold text-white" : undefined}
              >
                {isPro ? t("pro.badgePro") : t("pro.badgeFree")}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-charcoal/60">{detail}</p>
          </div>
        </div>
        <Link href="/pro" className="shrink-0 self-stretch sm:self-auto">
          <Button variant={urgent ? "gold" : "outline"} fullWidth>
            <StarIcon width={16} height={16} />
            {ctaLabel}
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
