import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Crown,
  Eye,
  Gem,
  Heart,
  Inbox,
  MapPin,
  Search,
  Sparkles,
  UserPen,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { GlowCard } from "@/components/ui/GlowCard";
import { WhoViewedMe } from "@/components/profile/WhoViewedMe";
import { MyPostedJobs } from "@/components/jobs/MyPostedJobs";
import { MyApplications } from "@/components/jobs/MyApplications";
import { RequestVerificationButton } from "@/components/jobs/RequestVerificationButton";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/data/dashboard";
import type { ProfileCompletion } from "@/lib/data/profileCompletion";
import type { ProfileViewers } from "@/lib/data/viewers";
import type { ViewerProStatus } from "@/lib/data/billing";
import type { MyJobPost, getAgentApplications } from "@/lib/data/jobs";

type AgentApplications = Awaited<ReturnType<typeof getAgentApplications>>;

/** Renew CTA turns urgent (gold) when fewer than this many days remain. */
const RENEW_SOON_DAYS = 14;

/** Quick location pills in the discovery banner (DISTRICTS `value`s). */
const QUICK_DISTRICTS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna"];
/** Quick profession pills (PROFESSIONS `value`s). */
const QUICK_PROFESSIONS = ["Doctor", "Engineer"];

/** Shared frosted-glass surface for the non-tilting dashboard cards. */
const GLASS =
  "rounded-card border border-white/50 bg-white/75 shadow-card backdrop-blur-xl";

export async function Dashboard({
  stats,
  completion,
  viewers,
  proStatus,
  myPostedJobs,
  agentApplications,
  userRole,
}: {
  stats: DashboardStats;
  completion: ProfileCompletion;
  viewers: ProfileViewers;
  proStatus: ViewerProStatus;
  myPostedJobs?: MyJobPost[];
  agentApplications?: AgentApplications;
  userRole?: string | null;
}) {
  const t = await getTranslations("Dashboard");
  const v = await getTranslations("Viewers");
  const pc = await getTranslations("ProfileCompletion");
  const locale = await getLocale();

  const greeting = stats.firstName
    ? t("greetingName", { name: stats.firstName })
    : t("greeting");

  const isRegularUser = userRole === "GENERAL" || userRole === "GUARDIAN";

  return (
    <div className="relative isolate overflow-hidden">
      {/* Soft brand washes behind the glass so the blur has something to frost. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            "radial-gradient(600px 300px at 10% 0%, rgba(140,47,74,0.10), transparent 70%), radial-gradient(500px 280px at 95% 10%, rgba(200,162,75,0.14), transparent 70%)",
        }}
      />

      <Container className="py-8 sm:py-10">
        {/* Header & membership status */}
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MembershipPill proStatus={proStatus} t={t} />
            {isRegularUser && <RequestVerificationButton />}
          </div>
        </header>

        {/* Profile completion strip */}
        {completion.score < 100 && (
          <div
            className={cn(
              GLASS,
              "mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <IconPill tone="primary">
                <UserPen size={18} strokeWidth={1.75} />
              </IconPill>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-ink">
                    {pc("title")}
                  </p>
                  <span className="font-body text-sm font-semibold text-primary">
                    {completion.score}%
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
                  role="progressbar"
                  aria-valuenow={completion.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${completion.score}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">{pc("subtitle")}</p>
              </div>
            </div>
            <Link
              href="/profile/edit"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark active:scale-[0.98]"
            >
              {pc("cta")}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Metric stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Eye size={18} strokeWidth={1.75} />}
            value={stats.profileViews}
            label={t("stats.views")}
            href="/viewers"
          />
          <StatCard
            icon={<Inbox size={18} strokeWidth={1.75} />}
            value={stats.pendingPhotoRequests}
            label={t("stats.photoRequests")}
            href="/requests"
            highlight={stats.pendingPhotoRequests > 0}
          />
          <StatCard
            icon={<Heart size={18} strokeWidth={1.75} />}
            value={stats.newInterests}
            label={t("stats.interests")}
            href="/interests"
            highlight={stats.newInterests > 0}
          />
          <StatCard
            icon={<Gem size={18} strokeWidth={1.75} />}
            value={stats.matches}
            label={t("stats.matches")}
            href="/browse"
          />
        </div>

        {/* Match discovery banner */}
        <section
          className={cn(
            GLASS,
            "relative overflow-hidden bg-gradient-to-br from-white/80 via-white/70 to-[rgba(140,47,74,0.06)] p-5 sm:p-6",
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <IconPill tone="primary">
                <Sparkles size={18} strokeWidth={1.75} />
              </IconPill>
              <div>
                <p className="font-display text-lg font-medium text-ink">
                  {t("cta.title")}
                </p>
                <p className="mt-0.5 text-sm text-muted">{t("cta.body")}</p>
              </div>
            </div>
            <Link
              href="/browse"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_6px_20px_rgba(140,47,74,0.25)] transition hover:bg-primary-dark active:scale-[0.98]"
            >
              <Search size={16} />
              {t("cta.action")}
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline/70 pt-4">
            <span className="mr-1 text-xs font-medium text-muted">
              {t("cta.quickLabel")}
            </span>
            {QUICK_DISTRICTS.map((d) => {
              const label =
                locale === "bn"
                  ? (DISTRICTS.find((x) => x.value === d)?.bn ?? d)
                  : d;
              return (
                <FilterPill
                  key={d}
                  href={`/browse?district=${encodeURIComponent(d)}`}
                  icon={<MapPin size={13} />}
                  label={label}
                />
              );
            })}
            {QUICK_PROFESSIONS.map((p) => (
              <FilterPill
                key={p}
                href={`/browse?profession=${encodeURIComponent(p)}`}
                label={localize(p, locale)}
              />
            ))}
          </div>
        </section>

        {/* Who viewed me */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">
              {v("heading")}
            </h2>
            {viewers.total > viewers.viewers.length && (
              <Link
                href="/viewers"
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                {v("seeAll", { n: String(viewers.total) })}
              </Link>
            )}
          </div>
          <WhoViewedMe viewers={viewers.viewers} />
        </section>

        {/* My Posted Jobs — visible to anyone who has posted jobs (incl. ADMIN) */}
        {myPostedJobs !== undefined && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">My Posted Jobs</h2>
            </div>
            <MyPostedJobs jobs={myPostedJobs} />
          </section>
        )}

        {/* My Applications — visible to AGENT users */}
        {agentApplications !== undefined && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">My Job Applications</h2>
              <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">
                Browse jobs →
              </Link>
            </div>
            <MyApplications applications={agentApplications} />
          </section>
        )}
      </Container>
    </div>
  );
}

/** Lucide icon inside a brand-tinted glass pill. */
function IconPill({
  tone,
  children,
}: {
  tone: "primary" | "accent" | "neutral";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-md",
        tone === "primary" &&
          "border-[rgba(140,47,74,0.15)] bg-[rgba(140,47,74,0.08)] text-primary",
        tone === "accent" &&
          "border-[rgba(200,162,75,0.25)] bg-[rgba(200,162,75,0.12)] text-accent",
        tone === "neutral" && "border-white/60 bg-white/60 text-ink/60",
      )}
    >
      {children}
    </span>
  );
}

function FilterPill({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-pill border border-hairline bg-white/70 px-3 py-1 text-xs font-medium text-ink/75 backdrop-blur-md transition hover:border-[rgba(140,47,74,0.35)] hover:bg-white hover:text-primary"
    >
      {icon}
      {label}
    </Link>
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
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <GlowCard
        enableTilt={true}
        className={highlight ? "ring-1 ring-[rgba(140,47,74,0.25)]" : undefined}
      >
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <IconPill tone={highlight ? "primary" : "neutral"}>{icon}</IconPill>
            <ArrowRight
              size={16}
              className="text-ink/25 transition group-hover/glow:translate-x-0.5 group-hover/glow:text-primary"
            />
          </div>
          <span className="font-body text-3xl font-semibold leading-none tracking-tight text-ink">
            {value}
          </span>
          <span className="text-xs font-medium text-muted">{label}</span>
        </div>
      </GlowCard>
    </Link>
  );
}

type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * Compact membership pill — e.g. "Free Plan · Expired Sep 19, 2026" — with a
 * soft glowing border and a renew/upgrade CTA. The CTA turns gold (urgent) when
 * Pro is expired, never bought, or within RENEW_SOON_DAYS.
 */
function MembershipPill({
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
  const isPro = state === "ACTIVE";
  const urgent = !isPro || soon;

  const planLabel = isPro ? t("pro.statusPro") : t("pro.statusFree");
  const detail =
    state === "ACTIVE"
      ? dateStr
        ? daysLeft !== null && soon
          ? t("pro.daysLeft", { n: String(daysLeft) })
          : t("pro.activeUntil", { date: dateStr })
        : t("pro.lifetime")
      : state === "EXPIRED" && dateStr
        ? t("pro.expiredShort", { date: dateStr })
        : null;

  const ctaLabel =
    state === "ACTIVE"
      ? t("pro.renew")
      : state === "EXPIRED"
        ? t("pro.renewPro")
        : t("pro.upgrade");

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-pill border bg-white/75 p-1 pl-3 backdrop-blur-xl",
        urgent
          ? "border-[rgba(200,162,75,0.45)] shadow-[0_0_0_3px_rgba(200,162,75,0.10),0_4px_18px_rgba(200,162,75,0.22)]"
          : "border-white/60 shadow-card",
      )}
    >
      <Crown
        size={15}
        className={isPro ? "text-accent" : "text-ink/40"}
        strokeWidth={1.75}
      />
      <span className="min-w-0 text-xs font-medium text-ink">
        {planLabel}
        {detail && <span className="text-muted"> · {detail}</span>}
      </span>
      <Link
        href="/pro"
        className={cn(
          "ml-1 inline-flex shrink-0 items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-semibold transition active:scale-[0.97]",
          urgent
            ? "bg-gradient-to-r from-accent to-[#b38a33] text-white shadow-[0_4px_14px_rgba(200,162,75,0.4)] hover:brightness-105"
            : "border border-hairline bg-white text-ink hover:border-[rgba(200,162,75,0.5)]",
        )}
      >
        <Sparkles size={13} />
        {ctaLabel}
      </Link>
    </div>
  );
}
