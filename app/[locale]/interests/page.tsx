import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { InterestInbox } from "@/components/interests/InterestInbox";
import { getReceivedInterests } from "@/lib/data/interests";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Received Interests · MatchMedia",
};

export default async function InterestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Interests");

  const interests = await getReceivedInterests(viewerId);

  return (
    <Container className="py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
      </header>

      <InterestInbox interests={interests} />
    </Container>
  );
}
