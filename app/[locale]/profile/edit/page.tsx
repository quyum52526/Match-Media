import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { getEditableProfile } from "@/lib/data/profiles";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Edit Profile · MatchMedia",
};

export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("ProfileEdit");

  const initial = await getEditableProfile(viewerId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">{t("title")}</h1>
      </header>
      <ProfileEditForm initial={initial} />
    </main>
  );
}
