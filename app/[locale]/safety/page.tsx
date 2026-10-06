import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { getPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPageMetadata(locale, "safety", "/safety");
}

export default async function SafetyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("SafetyPolicy");
  const sections = t.raw("sections") as { heading: string; body: string }[];

  return (
    <Container className="py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">{t("intro")}</p>
      <div className="mt-8 space-y-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg font-semibold text-ink">
              {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </Container>
  );
}
