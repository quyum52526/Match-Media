import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { TermsBody, type TermsSection } from "@/components/terms/TermsBody";

export const metadata = {
  title: "Terms and Conditions · MatchMedia",
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");
  const sections = t.raw("sections") as TermsSection[];

  return (
    <Container className="py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      {/* Single-page document: anchor nav + scrollspy live in the client body. */}
      <TermsBody sections={sections} />
    </Container>
  );
}
