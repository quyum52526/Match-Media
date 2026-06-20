import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { FilterBar } from "@/components/profile/FilterBar";
import { Button } from "@/components/ui/Button";
import { SearchIcon } from "@/components/ui/icons";
import { getBrowseProfiles, type SearchFilters } from "@/lib/data/profiles";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Browse · MatchMedia",
};

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

function num(v: string | string[] | undefined): number | undefined {
  const s = str(v);
  const n = s ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Browse");

  const filters: SearchFilters = {
    gender: str(sp.gender),
    minAge: num(sp.minAge),
    maxAge: num(sp.maxAge),
    district: str(sp.district),
    upazila: str(sp.upazila),
    profession: str(sp.profession),
    education: str(sp.education),
    maritalStatus: str(sp.maritalStatus),
    minHeight: str(sp.minHeight),
    maxHeight: str(sp.maxHeight),
  };
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  const profiles = await getBrowseProfiles(viewerId, filters);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">{t("title")}</h1>
        <p className="mt-1 text-sm text-charcoal/60">{t("subtitle")}</p>
      </header>

      <div className="mb-6">
        <FilterBar />
      </div>

      <p className="mb-4 font-sans text-sm text-charcoal/50">
        {t("resultCount", {
          count: profiles.length,
          n: String(profiles.length),
        })}
      </p>

      {profiles.length > 0 ? (
        <ProfileGrid profiles={profiles} />
      ) : hasFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-charcoal/15 bg-white py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/40">
            <SearchIcon width={22} height={22} />
          </span>
          <p className="text-base font-semibold text-charcoal">
            {t("noMatch.title")}
          </p>
          <p className="max-w-xs text-sm text-charcoal/60">
            {t("noMatch.hint")}
          </p>
          <Link href="/browse" className="mt-1">
            <Button variant="outline" size="sm">
              {t("noMatch.clear")}
            </Button>
          </Link>
        </div>
      ) : (
        <p className="text-sm text-charcoal/60">{t("empty")}</p>
      )}
    </main>
  );
}
