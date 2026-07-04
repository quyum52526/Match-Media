import { setRequestLocale } from "next-intl/server";
import { UserGuide, type GuideLang } from "@/components/guide/UserGuide";

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Guide content is self-contained with its own EN/BN toggle; the
          route locale only seeds the initial language. */}
      <UserGuide initialLang={locale === "bn" ? "bn" : ("en" as GuideLang)} />
    </main>
  );
}
