import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "bn" ? "আমাদের সম্পর্কে" : "About Us",
    description:
      locale === "bn"
        ? "MatchMedia কেন বানানো হলো, আর আপনার গোপনীয়তা আমরা কীভাবে রক্ষা করি।"
        : "Why MatchMedia was created and how we protect your privacy.",
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const values = t.raw("values") as { title: string; body: string }[];

  return (
    <Container className="py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      <Card className="mt-8">
        <CardBody>
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("missionTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            {t("missionBody")}
          </p>
        </CardBody>
      </Card>

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">
        {t("valuesTitle")}
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {values.map((value) => (
          <Card key={value.title}>
            <CardBody>
              <h3 className="text-sm font-semibold text-ink">{value.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                {value.body}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </Container>
  );
}
