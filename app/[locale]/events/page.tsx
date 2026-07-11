import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Events · MatchMedia",
};

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Events");
  const items = t.raw("items") as {
    title: string;
    date: string;
    location: string;
    description: string;
  }[];

  return (
    <Container className="py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <Card key={item.title}>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink/40">
                <span>{item.date}</span>
                <span aria-hidden="true">·</span>
                <span>{item.location}</span>
              </div>
              <h2 className="mt-1 text-base font-semibold text-ink">
                {item.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                {item.description}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </Container>
  );
}
