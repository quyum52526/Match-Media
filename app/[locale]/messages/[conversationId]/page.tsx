import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MessageThread } from "@/components/messages/MessageThread";
import { getConversation } from "@/lib/data/messages";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Conversation · MatchMedia",
};

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; conversationId: string }>;
}) {
  const { locale, conversationId } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);

  // Returns null when the conversation doesn't exist or the viewer isn't a
  // participant — the security boundary for the thread.
  const data = await getConversation(viewerId, conversationId);
  if (!data) notFound();

  return (
    // Deliberate exception to the global Container: the chat thread is an
    // app-like screen that runs edge-to-edge on mobile (no px-4 gutter), so
    // it keeps its own narrow wrapper instead of the standard page rail.
    <main className="mx-auto max-w-2xl">
      <MessageThread data={data} />
    </main>
  );
}
