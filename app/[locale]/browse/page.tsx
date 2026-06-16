import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { getBrowseProfiles } from "@/lib/data/profiles";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Browse · MatchMedia",
};

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Browse");

  // Reading the session above makes this route dynamic (per-request), so the
  // DB-backed grid always reflects current state for the authenticated viewer.
  const profiles = await getBrowseProfiles(viewerId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">{t("title")}</h1>
        <p className="mt-1 text-sm text-charcoal/60">{t("subtitle")}</p>
      </header>

      {profiles.length > 0 ? (
        <ProfileGrid profiles={profiles} />
      ) : (
        <p className="text-sm text-charcoal/60">{t("empty")}</p>
      )}
    </main>
  );
}
