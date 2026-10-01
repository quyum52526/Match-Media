import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { requireAdmin } from "@/lib/session";
import { getAdminNavCounts } from "@/lib/data/admin";
import { CountBadge } from "@/components/ui/CountBadge";

export const metadata = {
  title: "Admin · MatchMedia",
};

// Admin views are DB-backed and per-request — never prerendered.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Authoritative gate: signed-out -> login, non-admin -> home.
  await requireAdmin(`/${locale}/login`, `/${locale}`);
  const t = await getTranslations("Admin");
  // Counted after the gate, so a non-admin never triggers these queries.
  const counts = await getAdminNavCounts();

  // `count` is the size of the queue behind the tab. Tabs with nothing to
  // review (Overview, Users, Settings) carry no badge at all rather than a
  // zero, so the badges stay a to-do list instead of decoration.
  const tabs: { href: string; label: string; count?: number }[] = [
    { href: "/admin", label: t("nav.overview") },
    { href: "/admin/photos", label: t("nav.photos"), count: counts.photos },
    { href: "/admin/reports", label: t("nav.reports"), count: counts.reports },
    {
      href: "/admin/verification",
      label: t("nav.verification"),
      count: counts.verification,
    },
    // The document-review queue had no nav entry at all, so it was reachable
    // only by typing the URL.
    {
      href: "/admin/verifications",
      label: t("nav.documents"),
      count: counts.documents,
    },
    { href: "/admin/users", label: t("nav.users") },
    // Shown to both tiers: a moderator gets the live config read-only.
    { href: "/admin/settings", label: t("nav.settings") },
  ];

  return (
    <Container className="py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink/60">{t("subtitle")}</p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-ink/10 pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            {tab.label}
            {/* Rendered only when there is actually work waiting. */}
            {tab.count !== undefined && tab.count > 0 && (
              <CountBadge count={tab.count} label={tab.label} />
            )}
          </Link>
        ))}
      </nav>

      {children}
    </Container>
  );
}
