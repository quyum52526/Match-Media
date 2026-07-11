import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
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
    <Container className="py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-ink">{t("title")}</h1>
        <ConversationList conversations={conversations} />
      </div>
    </Container>
  );
}
