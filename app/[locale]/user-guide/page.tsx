import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { UserGuide, type GuideLang } from "@/components/guide/UserGuide";
import { UI_TEXT, guideFaqs } from "@/components/guide/guideContent";
import { breadcrumbSchema, faqPageSchema } from "@/lib/seo/schema";
import { toSeoLocale } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";
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
  const lang: GuideLang = locale === "bn" ? "bn" : "en";

  return (
    <Container className="py-10">
      {/* Guide content is self-contained with its own EN/BN toggle; the
          route locale only seeds the initial language. */}
      <UserGuide initialLang={lang} />
      <JsonLd
        data={[
          faqPageSchema(guideFaqs(lang), toSeoLocale(locale)),
          breadcrumbSchema(toSeoLocale(locale), [
            { name: UI_TEXT.heading[lang], path: "/user-guide" },
          ]),
        ]}
      />
    </Container>
  );
}
