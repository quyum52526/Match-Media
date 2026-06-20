import { getTranslations, setRequestLocale } from "next-intl/server";
import { WhoViewedMe } from "@/components/profile/WhoViewedMe";
import { getProfileViewers } from "@/lib/data/viewers";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Who viewed me · MatchMedia",
};

export default async function ViewersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Viewers");

  const { viewers, total, gated } = await getProfileViewers(viewerId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">{t("title")}</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          {t("subtitle", { count: total, n: String(total) })}
        </p>
        {gated && (
          <p className="mt-1 text-xs text-charcoal/45">{t("lockNote")}</p>
        )}
      </header>

      <WhoViewedMe viewers={viewers} />
    </main>
  );
}
