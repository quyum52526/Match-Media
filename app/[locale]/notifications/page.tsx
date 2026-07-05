import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getViewerId } from "@/lib/session";
import { getNotifications } from "@/lib/data/notifications";
import { Container } from "@/components/ui/Container";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata = {
  title: "Notifications · MatchMedia",
};

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await getViewerId();
  if (!viewerId) redirect({ href: "/login", locale });

  const items = await getNotifications(viewerId!);
  const t = await getTranslations("Notifications");

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-xl font-bold text-ink">{t("title")}</h1>
        <NotificationList items={items} />
      </div>
    </Container>
  );
}
