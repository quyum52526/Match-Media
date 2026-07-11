import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { requireAdmin } from "@/lib/session";

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

  const tabs: { href: string; label: string }[] = [
    { href: "/admin", label: t("nav.overview") },
    { href: "/admin/photos", label: t("nav.photos") },
    { href: "/admin/reports", label: t("nav.reports") },
    { href: "/admin/verification", label: t("nav.verification") },
    { href: "/admin/users", label: t("nav.users") },
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
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </Container>
  );
}
