import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserGuideAccordion, type UserGuideStep } from "@/components/guide/UserGuideAccordion";

export const metadata = {
  title: "User Guide · MatchMedia",
};

export default async function UserGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("UserGuide");
  const steps = t.raw("steps") as UserGuideStep[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      <div className="mt-8">
        <UserGuideAccordion steps={steps} />
      </div>
    </main>
  );
}
