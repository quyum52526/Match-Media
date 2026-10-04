import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "bn" ? "গোপনীয়তা নীতি" : "Privacy Policy",
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PrivacyPolicy");
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
