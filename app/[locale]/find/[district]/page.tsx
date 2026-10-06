import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BadgeCheck,
  EyeOff,
  IdCard,
  Lock,
  MapPin,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { GlowCard } from "@/components/ui/GlowCard";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  FEATURED_DISTRICT_SLUGS,
  getDistrictSampleProfiles,
  getDistrictStats,
  resolveDistrict,
  type AnonymizedProfile,
  type ResolvedDistrict,
} from "@/lib/data/publicDirectory";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/seo/schema";
import { SEO_LOCALES, localePath, toSeoLocale } from "@/lib/seo/site";

// Counts and blurred-photo URLs are cached in the data layer for 30 minutes;
// the page itself regenerates on the same cadence.
export const revalidate = 1800;

type Params = Promise<{ locale: string; district: string }>;

/** Prerender the featured districts in both locales; others render on demand. */
export function generateStaticParams() {
  return SEO_LOCALES.flatMap((locale) =>
    FEATURED_DISTRICT_SLUGS.map((district) => ({ locale, district })),
  );
}

/** Bangla case endings: ঢাকা → ঢাকায় / ঢাকার, চট্টগ্রাম → চট্টগ্রামে / চট্টগ্রামের. */
function bnLocative(name: string): string {
  if (name.endsWith("া")) return `${name}য়`;
  if (/[া-ৌ]$/.test(name)) return `${name}তে`;
  return `${name}ে`;
}
function bnGenitive(name: string): string {
  return /[া-ৌ]$/.test(name) ? `${name}র` : `${name}ের`;
}

/** ICU args for the Find messages: plain, "in X" and "of X" forms. */
function districtArgs(district: ResolvedDistrict, locale: string) {
  if (locale === "bn") {
    return {
      district: district.bn,
      districtIn: bnLocative(district.bn),
      districtOf: bnGenitive(district.bn),
    };
  }
  return {
    district: district.name,
    districtIn: district.name,
    districtOf: district.name,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, district: slug } = await params;
  const district = resolveDistrict(slug);
  if (!district) notFound();
  const t = await getTranslations({ locale, namespace: "Find" });
  const args = districtArgs(district, locale);
  return buildPageMetadata({
    locale,
    path: `/find/${district.slug}`,
    title: t("metaTitle", args),
    description: t("metaDescription", args),
  });
}

export default async function FindDistrictPage({ params }: { params: Params }) {
  const { locale, district: slug } = await params;
  const district = resolveDistrict(slug);
  if (!district) notFound();
  // Alternate spellings (chittagong, comilla…) consolidate onto one URL.
  if (district.isAlias) {
    permanentRedirect(
      localePath(toSeoLocale(locale), `/find/${district.slug}`),
    );
  }
  setRequestLocale(locale);

  const [stats, samples, t] = await Promise.all([
    getDistrictStats(district.slug),
    getDistrictSampleProfiles(district.slug, 6),
    getTranslations("Find"),
  ]);
  const args = districtArgs(district, locale);
  const fmt = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");
  const seoLocale = toSeoLocale(locale);

  const verified = stats?.verifiedProfiles ?? 0;
  const total = stats?.totalProfiles ?? 0;
  const badge =
    verified > 0
      ? t("verifiedBadge", { count: fmt.format(verified) })
      : total > 0
        ? t("membersBadge", { ...args, count: fmt.format(total) })
        : t("newBadge", args);

  const features = [
    { key: "nid", Icon: IdCard },
    { key: "privacy", Icon: EyeOff },
    { key: "agent", Icon: UserCheck },
  ] as const;

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            "radial-gradient(600px 300px at 10% 0%, rgba(140,47,74,0.10), transparent 70%), radial-gradient(500px 280px at 95% 10%, rgba(200,162,75,0.14), transparent 70%)",
        }}
      />

      <Container className="py-10 sm:py-14">
        {/* Hero */}
        <header className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <MapPin size={15} aria-hidden="true" />
            {t("eyebrow", args)}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight text-ink sm:text-4xl">
            {t("heading", args)}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            {t("intro", args)}
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-pill border border-[rgba(46,125,91,0.25)] bg-white/80 px-4 py-1.5 text-sm font-medium text-success backdrop-blur-md">
            <ShieldCheck size={16} aria-hidden="true" />
            {badge}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <CtaLinks t={t} />
          </div>
        </header>

        {/* Anonymized previews */}
        <section aria-labelledby="preview-heading" className="mt-14">
          <h2
            id="preview-heading"
            className="font-display text-2xl font-medium text-ink"
          >
            {t("previewTitle", args)}
          </h2>
          <p className="mt-1.5 text-sm text-muted">{t("previewNote")}</p>

          {samples.length > 0 ? (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {samples.map((profile) => (
                <li key={profile.id}>
                  <PreviewCard
                    profile={profile}
                    districtLabel={args.district}
                    t={t}
                    fmt={fmt}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-2xl border border-primary/10 bg-white/60 p-6 text-center text-sm text-muted backdrop-blur-md">
              {t("emptyPreview", args)}
            </p>
          )}
        </section>

        {/* Feature highlights */}
        <section aria-labelledby="features-heading" className="mt-16">
          <h2
            id="features-heading"
            className="font-display text-2xl font-medium text-ink"
          >
            {t("featuresTitle", args)}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {features.map(({ key, Icon }) => (
              <li key={key}>
                <GlowCard enableTilt={false} className="p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(140,47,74,0.15)] bg-[rgba(140,47,74,0.08)] text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {t(`features.${key}.body`)}
                  </p>
                </GlowCard>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing CTA */}
        <section className="mt-16 rounded-card border border-primary/15 bg-[rgba(140,47,74,0.05)] p-6 text-center sm:p-10">
          <h2 className="font-display text-2xl font-medium text-ink">
            {t("ctaTitle", args)}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t("ctaBody")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <CtaLinks t={t} />
          </div>
        </section>
      </Container>

      <JsonLd
        data={[
          collectionPageSchema({
            locale: seoLocale,
            path: `/find/${district.slug}`,
            name: t("metaTitle", args),
            description: t("metaDescription", args),
            placeName: district.name,
          }),
          breadcrumbSchema(seoLocale, [
            { name: t("heading", args), path: `/find/${district.slug}` },
          ]),
        ]}
      />
    </div>
  );
}

type FindT = Awaited<ReturnType<typeof getTranslations>>;

function CtaLinks({ t }: { t: FindT }) {
  return (
    <>
      <Link
        href="/register"
        className="inline-flex items-center justify-center rounded-pill bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-[0_6px_20px_rgba(140,47,74,0.25)] transition hover:bg-primary-dark active:scale-[0.98]"
      >
        {t("ctaRegister")}
      </Link>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-pill border border-hairline bg-white px-6 py-2.5 text-sm font-medium text-ink transition hover:border-primary/30"
      >
        {t("ctaLogin")}
      </Link>
    </>
  );
}

/**
 * Anonymized member card. Renders only the fields getDistrictSampleProfiles
 * returns — blurred photo, gender, age, district, verified flag — and gates
 * everything else behind registration.
 */
function PreviewCard({
  profile,
  districtLabel,
  t,
  fmt,
}: {
  profile: AnonymizedProfile;
  districtLabel: string;
  t: FindT;
  fmt: Intl.NumberFormat;
}) {
  const genderLabel = profile.gender === "Female" ? t("bride") : t("groom");
  return (
    <GlowCard enableTilt={true}>
      <article>
        <div className="relative aspect-[4/5] overflow-hidden bg-ink/5">
          {profile.blurredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.blurredImageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full scale-110 object-cover blur-xl"
            />
          ) : (
            <div
              aria-hidden
              className="h-full w-full bg-gradient-to-br from-[rgba(140,47,74,0.30)] via-[rgba(46,125,91,0.18)] to-[rgba(200,162,75,0.25)]"
            />
          )}
          <Link
            href="/register"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/20 text-white transition hover:bg-ink/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink">
              <Lock size={18} aria-hidden="true" />
            </span>
            <span className="rounded-pill bg-ink/60 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {t("locked")}
            </span>
          </Link>
          {profile.isVerified && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-pill bg-white/90 px-2 py-0.5 text-xs font-medium text-success">
              <BadgeCheck size={13} aria-hidden="true" />
              {t("verified")}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 p-3.5">
          <p className="text-sm font-semibold text-ink">
            {genderLabel}
            <span className="font-normal text-muted">
              {" · "}
              {t("age", { age: fmt.format(profile.age) })}
            </span>
          </p>
          <Badge>{districtLabel}</Badge>
        </div>
      </article>
    </GlowCard>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-hairline bg-white/70 px-2 py-0.5 text-xs text-ink/70">
      <MapPin size={11} aria-hidden="true" />
      {children}
    </span>
  );
}
