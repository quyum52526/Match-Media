import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";

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
  const sections = t.raw("sections") as { heading: string; body: string }[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      <Card className="mt-8">
        <CardBody className="space-y-5">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold text-ink">
                {section.heading}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                {section.body}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>
    </main>
  );
}
