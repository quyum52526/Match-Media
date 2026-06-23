import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { VerificationList } from "@/components/admin/VerificationList";
import { getVerificationProfiles } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export default async function AdminVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.verification");

  const active = filter === "all" ? "all" : "unverified";
  const profiles = await getVerificationProfiles(active);

  const filters: { key: "unverified" | "all"; label: string }[] = [
    { key: "unverified", label: t("filterUnverified") },
    { key: "all", label: t("filterAll") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/verification?filter=${f.key}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active === f.key
                ? "bg-primary text-white"
                : "bg-ink/5 text-ink/60 hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <VerificationList profiles={profiles} />
    </div>
  );
}
