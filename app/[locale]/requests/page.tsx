import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestInbox } from "@/components/requests/RequestInbox";
import { getReceivedRequests, getSentRequests } from "@/lib/data/requests";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Photo Requests · MatchMedia",
};

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Requests");

  // Received (ownerId = viewer) and sent (viewerId = viewer) requests, from DB.
  const [received, sent] = await Promise.all([
    getReceivedRequests(viewerId),
    getSentRequests(viewerId),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
      </header>

      <RequestInbox received={received} sent={sent} />
    </main>
  );
}
