import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { UserGuide, type GuideLang } from "@/components/guide/UserGuide";
import { getPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPageMetadata(locale, "userGuide", "/user-guide");
}

export default async function UserGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container className="py-10">
      {/* Guide content is self-contained with its own EN/BN toggle; the
          route locale only seeds the initial language. */}
      <UserGuide initialLang={locale === "bn" ? "bn" : ("en" as GuideLang)} />
    </Container>
  );
}
