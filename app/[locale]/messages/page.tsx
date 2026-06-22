import { setRequestLocale, getTranslations } from "next-intl/server";
import { ConversationList } from "@/components/messages/ConversationList";
import { getConversations } from "@/lib/data/messages";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Messages · MatchMedia",
};

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("Messages");
  const conversations = await getConversations(viewerId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold text-charcoal">{t("title")}</h1>
      <ConversationList conversations={conversations} />
    </main>
  );
}
