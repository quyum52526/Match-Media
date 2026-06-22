import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { getAdminStats } from "@/lib/data/admin";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.overview");

  const stats = await getAdminStats();
  const cards: { href: string; label: string; value: number }[] = [
    { href: "/admin/photos", label: t("pendingPhotos"), value: stats.pendingPhotos },
    { href: "/admin/reports", label: t("openReports"), value: stats.openReports },
    {
      href: "/admin/verification",
      label: t("unverifiedProfiles"),
      value: stats.unverifiedProfiles,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.href} href={c.href}>
          <Card className="transition-shadow hover:shadow-md">
            <CardBody>
              <p className="font-sans text-3xl font-bold text-charcoal">{c.value}</p>
              <p className="mt-1 text-sm text-charcoal/60">{c.label}</p>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
