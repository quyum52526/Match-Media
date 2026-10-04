import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Pricing · MatchMedia",
};

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");

  return (
    <Container className="py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70">
        {t("details")}
      </p>
      <Link
        href="/pro"
        className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        {t("action")}
      </Link>
    </Container>
  );
}
