import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata = {
  title: "Contact Us · MatchMedia",
};

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  const rows = [
    { label: t("emailLabel"), value: t("email") },
    { label: t("phoneLabel"), value: t("phone") },
    { label: t("hoursLabel"), value: t("hours") },
    { label: t("addressLabel"), value: t("address") },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      <Card className="mt-8">
        <CardBody>
          <dl className="divide-y divide-hairline">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-ink/40">
                  {row.label}
                </dt>
                <dd className="text-sm font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </main>
  );
}
